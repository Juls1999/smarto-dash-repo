<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Optional domain filter (currently unused in backend, but supports future expansion)
$domain = $_GET['domain'] ?? null;

$baseUrl = $_ENV['BASE_URL']; // e.g. https://api.example.com
$apiUrl = $baseUrl . '/domain-files' . ($domain ? ('?domain=' . urlencode($domain)) : '');
$apiKey = $_ENV['CUSTOM_API_KEY'];

// Initialize cURL
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: $apiKey"
]);

// Execute and capture response
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Output the response
http_response_code($httpCode);
header('Content-Type: application/json');
echo $response;
