<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

$response = [];

try {
    // Get category name from POST
    $category_name = trim($_POST['category'] ?? '');
    $desc = trim($_POST['desc'] ?? '');

    if ($category_name === '') {
        throw new Exception("Category name cannot be empty.");
    }

    $stmt = $conn->prepare("INSERT INTO article_category (name,description) VALUES (?,?)");
    $stmt->bind_param("ss", $category_name,$desc);
    $stmt->execute();

    $response['status'] = 'success';
    $response['message'] = 'Category added successfully';
    $response['insert_id'] = $stmt->insert_id;

    $stmt->close();
} catch (mysqli_sql_exception $e) {
    $response['status'] = 'error';
    $response['message'] = 'Database Error: ' . $e->getMessage();
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
} finally {
    if (isset($conn)) {
        $conn->close();
    }
    echo json_encode($response);
}
