<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Optional: Get domain query (your backend route must support this)
$domain = $_GET['domain'] ?? null;

// Construct API endpoint
$baseUrl = rtrim($_ENV['BASE_URL'], '/'); // remove trailing slash
$apiUrl = $baseUrl . '/list-files' . ($domain ? ('?domain=' . urlencode($domain)) : '');

// Add API key header
$apiKey = $_ENV['CUSTOM_API_KEY'];

// Initialize cURL
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: $apiKey",
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Forward the response and HTTP status code
http_response_code($httpCode);
header('Content-Type: application/json');
echo $response;
