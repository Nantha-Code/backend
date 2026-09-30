const express = require("express");
const {
    applyLeave,
    getMyLeaves,
    getManagerLeaves,
    updateStatus,
    getMyBalance,
    cancelMyLeave
} = require("../controllers/leaveController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Employee routes
router.post(
    "/",
    authenticateToken,
    authorizeRole("employee"),
    applyLeave
);

router.get(
    "/my",
    authenticateToken,
    authorizeRole("employee"),
    getMyLeaves
);

router.get(
    "/balance",
    authenticateToken,
    authorizeRole("employee"),
    getMyBalance
);

router.put(
    "/:id/cancel",
    authenticateToken,
    authorizeRole("employee"),
    cancelMyLeave
);

// Manager routes
router.get(
    "/manager",
    authenticateToken,
    authorizeRole("manager"),
    getManagerLeaves
);

router.put(
    "/:id/status",
    authenticateToken,
    authorizeRole("manager"),
    updateStatus
);

module.exports = router;