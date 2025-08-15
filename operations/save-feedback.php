<?php
header('Content-Type: application/json');

// ✅ Include DB connection
require_once '../db/db_config.php';

// Sanitize and validate input
$prompt = isset($_POST['prompt']) ? trim($_POST['prompt']) : '';
$response = isset($_POST['response']) ? trim($_POST['response']) : '';
$feedbackType = isset($_POST['feedbackType']) ? strtolower(trim($_POST['feedbackType'])) : '';

if (empty($prompt) || empty($response) || !in_array($feedbackType, ['like', 'dislike'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO feedback (prompt, ai_response, feedback) VALUES (?, ?, ?)");
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param("sss", $prompt, $response, $feedbackType);

// Execute
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Feedback saved']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
