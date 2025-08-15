<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

if (!isset($_POST['id'], $_POST['name'], $_POST['desc'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
    exit;
}

$id = intval($_POST['id']);
$name = trim($_POST['name']);
$desc = trim($_POST['desc']);

// Step 1: Get the current values from DB
$sql_check = "SELECT name, description FROM article_category WHERE id = ?";
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
$original_name = trim($row['name']);
$original_desc = trim($row['description']);

$stmt_check->close();

// Step 2: Check if values are unchanged
if ($name === $original_name && $desc === $original_desc) {
    echo json_encode(['status' => 'error', 'message' => 'No changes detected.']);
    exit;
}

// Step 3: Proceed with update
$sql_update = "UPDATE article_category SET name = ?, description = ? WHERE id = ?";
$stmt_update = $conn->prepare($sql_update);

if (!$stmt_update) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare update statement.']);
    exit;
}

$stmt_update->bind_param("ssi", $name, $desc, $id);

if ($stmt_update->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Category updated successfully.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update category.']);
}

$stmt_update->close();
$conn->close();
