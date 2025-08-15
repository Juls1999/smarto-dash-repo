<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

if (!isset($_POST['article_id'], $_POST['content'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
    exit;
}

$id = intval($_POST['article_id']);
$content = trim($_POST['content']);

// Step 1: Get the current values from DB
$sql_check = "SELECT content FROM articles WHERE id = ?";
$stmt_check = $conn->prepare($sql_check);

if (!$stmt_check) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare statement for checking.']);
    exit;
}

$stmt_check->bind_param("i", $id);
$stmt_check->execute();
$result = $stmt_check->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Category not found.']);
    exit;
}

$row = $result->fetch_assoc();
$original_content = trim($row['content']);

$stmt_check->close();

// Step 2: Check if values are unchanged
if ($content === $original_content) {
    echo json_encode(['status' => 'error', 'message' => 'No changes detected.']);
    exit;
}

// Step 3: Proceed with update
$sql_update = "UPDATE articles SET content = ? WHERE id = ?";
$stmt_update = $conn->prepare($sql_update);

if (!$stmt_update) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare update statement.']);
    exit;
}

$stmt_update->bind_param("si", $content, $id);

if ($stmt_update->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Category updated successfully.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update category.']);
}

$stmt_update->close();
$conn->close();
