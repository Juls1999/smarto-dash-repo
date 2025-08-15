<?php
session_start();
require_once "../db/db_config.php";

$valid_methods = ['rewrite', 'step_back', 'sub_queries', 'none'];

$retrieval_method = $_POST['retrieval_method'] ?? '';
if (!in_array($retrieval_method, $valid_methods)) {
    die("Invalid retrieval method.");
}

// Sanitize & cast all values
$temperature = floatval($_POST['temperature'] ?? 0);
$top_p = floatval($_POST['top_p'] ?? 0);
$k = intval($_POST['k'] ?? 0);
$frequency_penalty = floatval($_POST['frequency_penalty'] ?? 0);
$instruction_override = $_POST['instruction_override'] ?? '';

// Update query
$stmt = $conn->prepare("UPDATE ai_settings SET temperature=?, top_p=?, k=?, retrieval_method=?, frequency_penalty=?, instruction_override=?, updated_at=NOW() WHERE id = 1");
$stmt->bind_param("ddisds", $temperature, $top_p, $k, $retrieval_method, $frequency_penalty, $instruction_override);

if ($stmt->execute()) {
    echo "success";
    exit;
} else {
    http_response_code(500);
    echo "Error: " . $stmt->error;
}


$stmt->close();
$conn->close();
