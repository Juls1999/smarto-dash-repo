<?php
require_once '../db/db_config.php';

$sql = "SELECT 
            ac.id AS category_id,
            ac.name AS category_name,
            ac.description AS category_description,
            a.id AS article_id, 
            a.name AS article_title, 
            a.content,
            a.created_at
        FROM article_category ac
        LEFT JOIN articles a 
            ON ac.id = a.category_id
        ORDER BY ac.id, a.id";

$result = $conn->query($sql);

$categories = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $catId = $row['category_id'];

        if (!isset($categories[$catId])) {
            $categories[$catId] = [
                'category_id' => $catId,
                'title' => $row['category_name'],
                'subtitle' => $row['category_description'],
                'article' => []
            ];
        }

        // Add article only if it exists
        if (!empty($row['article_id'])) {
            $categories[$catId]['article'][] = [
                'article_id' => $row['article_id'],
                'article_title' => $row['article_title'],
                'content' => $row['content'],
                'created_at' => $row['created_at'],
            ];
        }
    }
}

header('Content-Type: application/json');
echo json_encode(array_values($categories));
$conn->close();
