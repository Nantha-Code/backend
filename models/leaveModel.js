const pool = require("../config/db");

const formatLeaveDates = (leave) => {
    if (!leave) return leave;

    return {
        ...leave,
        start_date: leave.start_date
            ? new Date(leave.start_date).toISOString().slice(0, 10)
            : null,
        end_date: leave.end_date
            ? new Date(leave.end_date).toISOString().slice(0, 10)
            : null
    };
};

const createLeave = async (
    userId,
    leaveType,
    startDate,
    endDate,
    reason
) => {
    const result = await pool.query(
        `INSERT INTO leaves
        (user_id, leave_type, start_date, end_date, reason)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, leaveType, startDate, endDate, reason]
    );

    return formatLeaveDates(result.rows[0]);
};

const getLeavesByUserId = async (userId) => {
    const result = await pool.query(
        `SELECT
            id,
            user_id,
            leave_type,
            TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
            reason,
            status,
            manager_comment,
            applied_at
         FROM leaves
         WHERE user_id = $1
         ORDER BY applied_at DESC`,
        [userId]
    );

    return result.rows;
};

const getAllLeaves = async () => {
    const result = await pool.query(
        `SELECT
            leaves.id,
            leaves.user_id,
            leaves.leave_type,
            TO_CHAR(leaves.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(leaves.end_date, 'YYYY-MM-DD') AS end_date,
            leaves.reason,
            leaves.status,
            leaves.manager_comment,
            leaves.applied_at,
            users.name AS employee_name,
            users.email AS employee_email
         FROM leaves
         JOIN users ON leaves.user_id = users.id
         ORDER BY leaves.applied_at DESC`
    );

    return result.rows;
};

const updateLeaveStatus = async (
    leaveId,
    status,
    managerComment = null
) => {
    const result = await pool.query(
        `UPDATE leaves
         SET status = $1,
             manager_comment = $2
         WHERE id = $3
         RETURNING *`,
        [status, managerComment, leaveId]
    );

    return formatLeaveDates(result.rows[0]);
};

// Get remaining leave balance
const getLeaveBalance = async (userId) => {
    const result = await pool.query(
        `SELECT
            leave_type,
            COALESCE(SUM(end_date - start_date + 1), 0) AS used_days
         FROM leaves
         WHERE user_id = $1
         AND status = 'APPROVED'
         GROUP BY leave_type`,
        [userId]
    );

    const balance = {
        earned: 12,
        sick: 10
    };

    result.rows.forEach((row) => {
        const usedDays = Number(row.used_days);

        if (row.leave_type === "Earned") {
            balance.earned -= usedDays;
        }

        if (row.leave_type === "Sick") {
            balance.sick -= usedDays;
        }
    });

    return balance;
};

const cancelLeave = async (leaveId, userId) => {
    const result = await pool.query(
        `UPDATE leaves
         SET status = 'CANCELLED'
         WHERE id = $1
         AND user_id = $2
         AND status = 'PENDING'
         RETURNING *`,
        [leaveId, userId]
    );

    return formatLeaveDates(result.rows[0]);
};

const checkOverlappingLeave = async (
    userId,
    startDate,
    endDate
) => {
    const result = await pool.query(
        `SELECT id
         FROM leaves
         WHERE user_id = $1
         AND status IN ('PENDING', 'APPROVED')
         AND start_date <= $3
         AND end_date >= $2
         LIMIT 1`,
        [userId, startDate, endDate]
    );

    return result.rows[0];
};



module.exports = {
    createLeave,
    getLeavesByUserId,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveBalance,
    cancelLeave,
    checkOverlappingLeave
};