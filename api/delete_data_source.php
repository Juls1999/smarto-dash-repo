<?php
require '../vendor/autoload.php';

use Aws\S3\S3Client;

// Load env vars
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$spaceKey = $_ENV['SPACE_KEY'];
$spaceSecret = $_ENV['SPACE_SECRET'];
$spaceRegion = 'tor1';
$spaceName = 'smarto-dash-bucket';
$endpoint = "https://{$spaceRegion}.digitaloceanspaces.com";

$folderToDelete = $_POST['folder'] ?? '';

if (!$folderToDelete) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing folder name']);
    exit;
}

// Sanitize folder name the same way
$folderPrefix = preg_replace('/[^a-zA-Z0-9-_]/', '-', $folderToDelete) . '/';

try {
    $s3Client = new S3Client([
        'version' => 'latest',
        'region' => $spaceRegion,
        'endpoint' => $endpoint,
        'credentials' => [
            'key' => $spaceKey,
            'secret' => $spaceSecret,
        ],
    ]);

    // Step 1: List objects under the folder prefix
    $objects = $s3Client->listObjectsV2([
        'Bucket' => $spaceName,
        'Prefix' => $folderPrefix
    ]);

    if (empty($objects['Contents'])) {
        echo json_encode(['message' => 'Folder is already empty or does not exist.']);
        exit;
    }

    // Step 2: Build list of keys to delete
    $deleteObjects = array_map(function ($object) {
        return ['Key' => $object['Key']];
    }, $objects['Contents']);

    // Step 3: Delete all objects under the folder
    $result = $s3Client->deleteObjects([
        'Bucket' => $spaceName,
        'Delete' => ['Objects' => $deleteObjects]
    ]);

    echo json_encode(['success' => true, 'deleted' => $result['Deleted']]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
