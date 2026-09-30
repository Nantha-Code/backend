    const {
    createLeave,
    getLeavesByUserId,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveBalance,
    cancelLeave,
    checkOverlappingLeave
} = require("../models/leaveModel");


// Apply Leave
const applyLeave = async (req, res) => {
    try {
        const {
            leaveType,
            startDate,
            endDate,
            reason
        } = req.body;

        // 1. Required fields
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({
                message: "All leave fields are required"
            });
        }

        // 2. Validate leave type
        if (!["Earned", "Sick"].includes(leaveType)) {
            return res.status(400).json({
                message: "Invalid leave type"
            });
        }

        // 3. Validate dates
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                message: "Start date cannot be after end date"
            });
        }

        // 4. Check overlapping leave
        const overlappingLeave = await checkOverlappingLeave(
            req.user.id,
            startDate,
            endDate
        );

        if (overlappingLeave) {
            return res.status(400).json({
                message: "You already have a pending or approved leave for these dates"
            });
        }

        // 5. Calculate requested leave days
        const start = new Date(startDate);
        const end = new Date(endDate);

        const requestedDays =
            Math.floor(
                (end - start) / (1000 * 60 * 60 * 24)
            ) + 1;

        // 6. Get current leave balance
        const balance = await getLeaveBalance(req.user.id);

        console.log("Leave balance:", balance);

        // 7. Get available balance
        const availableDays =
            leaveType === "Earned"
                ? Number(
                    balance.earned ??
                    balance.earnedLeave ??
                    balance.earned_balance ??
                    balance.earnedBalance
                )
                : Number(
                    balance.sick ??
                    balance.sickLeave ??
                    balance.sick_balance ??
                    balance.sickBalance
                );

        console.log("Available days:", availableDays);
        console.log("Requested days:", requestedDays);

        // 8. Validate balance
        if (Number.isNaN(availableDays)) {
            return res.status(500).json({
                message: "Unable to determine leave balance"
            });
        }

        if (requestedDays > availableDays) {
            return res.status(400).json({
                message:
                    `Insufficient ${leaveType} leave balance. ` +
                    `Available: ${availableDays} days, ` +
                    `Requested: ${requestedDays} days`
            });
        }

        // 9. Create leave request
        const leave = await createLeave(
            req.user.id,
            leaveType,
            startDate,
            endDate,
            reason
        );

        res.status(201).json({
            message: "Leave applied successfully",
            leave
        });

    } catch (error) {
        console.error("Apply leave error:", error.message);

        res.status(500).json({
            message: "Failed to apply leave"
        });
    }
};


// Get Employee Leave History
const getMyLeaves = async (req, res) => {
    try {
        const leaves = await getLeavesByUserId(req.user.id);

        res.json({
            leaves
        });

    } catch (error) {
        console.error("Get leaves error:", error.message);

        res.status(500).json({
            message: "Failed to fetch leaves"
        });
    }
};


// Get All Leaves for Manager
const getManagerLeaves = async (req, res) => {
    try {
        const leaves = await getAllLeaves();

        res.json({
            leaves
        });

    } catch (error) {
        console.error("Get manager leaves error:", error.message);

        res.status(500).json({
            message: "Failed to fetch leave requests"
        });
    }
};


// Approve / Reject Leave
const updateStatus = async (req, res) => {
    try {
        const { status, managerComment } = req.body;
        const { id } = req.params;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const leave = await updateLeaveStatus(
            id,
            status,
            managerComment || null
        );

        if (!leave) {
            return res.status(404).json({
                message: "Leave request not found"
            });
        }

        res.json({
            message: `Leave ${status.toLowerCase()} successfully`,
            leave
        });

    } catch (error) {
        console.error("Update leave status error:", error.message);

        res.status(500).json({
            message: "Failed to update leave status"
        });
    }
};


// Get Employee Leave Balance
const getMyBalance = async (req, res) => {
    try {
        const balance = await getLeaveBalance(req.user.id);

        res.json({
            balance
        });

    } catch (error) {
        console.error("Get leave balance error:", error.message);

        res.status(500).json({
            message: "Failed to fetch leave balance"
        });
    }
};


// Cancel Pending Leave
const cancelMyLeave = async (req, res) => {
    try {
        const { id } = req.params;

        const leave = await cancelLeave(
            id,
            req.user.id
        );

        if (!leave) {
            return res.status(400).json({
                message: "Only pending leave requests can be cancelled"
            });
        }

        res.json({
            message: "Leave cancelled successfully",
            leave
        });

    } catch (error) {
        console.error("Cancel leave error:", error.message);

        res.status(500).json({
            message: "Failed to cancel leave"
        });
    }
};


module.exports = {
    applyLeave,
    getMyLeaves,
    getManagerLeaves,
    updateStatus,
    getMyBalance,
    cancelMyLeave
};
