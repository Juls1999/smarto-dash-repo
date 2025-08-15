<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$apiUrl = $_ENV['BASE_URL'];
$apiKey = $_ENV['CUSTOM_API_KEY'];

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

$ch = curl_init($apiUrl . '/upload-to-space');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json', // ✅ important
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Ensure proper headers
header('Content-Type: application/json');
http_response_code($httpCode);

// Parse and re-encode for consistency
$json = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo json_encode($json); // Forward clean object
} else {
    echo json_encode([
        'error' => 'Invalid JSON returned from API',
        'raw' => $response
    ]);
}
