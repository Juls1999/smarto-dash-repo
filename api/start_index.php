<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// DigitalOcean API token
$digitalOceanToken = $_ENV['DO_API_KEY'];
$kbId = $_ENV['KB_ID'];

header('Content-Type: application/json');

// Endpoint for creating an indexing job
$url = 'https://api.digitalocean.com/v2/gen-ai/indexing_jobs';

// Payload data
$payload = [
    "knowledge_base_uuid" => $kbId,
];

// Initialize cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $digitalOceanToken",
    "Content-Type: application/json"
]);

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Return response
if ($httpCode === 201 || $httpCode === 200) {
    echo json_encode([
        'success' => true,
        'status' => $httpCode,
        'response' => json_decode($response, true)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'status' => $httpCode,
        'error' => 'Failed to create indexing job',
        'raw_response' => $response
    ]);
}
?>