<?php
require_once '../db/db_config.php';
require '../vendor/autoload.php';

use Aws\S3\S3Client;
use Dotenv\Dotenv;
use League\HTMLToMarkdown\HtmlConverter;

header('Content-Type: application/json');

$response = [];

try {
    // Load env vars for S3
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->load();

    // Query DB for all files with category name
    $sql = "
        SELECT a.content, a.name, c.name AS category_name
        FROM articles a
        INNER JOIN article_category c ON c.id = a.category_id
    ";
    $result = $conn->query($sql);

    if (!$result || $result->num_rows === 0) {
        throw new Exception("No files found in database.");
    }

    // Create S3 client
    $client = new S3Client([
        'region' => 'tor1',
        'version' => 'latest',
        'credentials' => [
            'key' => $_ENV['SPACE_KEY'],
            'secret' => $_ENV['SPACE_SECRET'],
        ],
        'endpoint' => 'https://tor1.digitaloceanspaces.com' // DigitalOcean Spaces endpoint
    ]);

    $uploaded = [];
    $failed = [];


    // Create the converter once
    $converter = new HtmlConverter([
        'strip_tags' => true,
        'hard_break' => true
    ]);

    while ($row = $result->fetch_assoc()) {
        // Replace spaces with dashes before encoding
        $categorySlug = str_replace(' ', '-', $row['category_name']);
        $nameSlug = str_replace(' ', '-', $row['name']);

        // Create a URL-safe S3 key and use .md extension
        $fileKey = rawurlencode($categorySlug) . '/' . rawurlencode($nameSlug) . '.md';

        // Convert HTML to Markdown
        $htmlContent = $row['content'];
        $markdownContent = $converter->convert($htmlContent);

        try {
            $res = $client->putObject([
                'Bucket' => 'smarto-dash-bucket',
                'Key' => $fileKey,
                'Body' => $markdownContent,
                'ACL' => 'public-read',
                'ContentType' => 'text/markdown; charset=UTF-8',
            ]);

            $uploaded[] = [
                "file" => $fileKey,
                "etag" => $res['ETag'],
                "url" => "https://smarto-dash-bucket.tor1.digitaloceanspaces.com/" . $fileKey
            ];
        } catch (Exception $e) {
            $failed[] = [
                "file" => $fileKey,
                "error" => $e->getMessage()
            ];
        }
    }


    $response['status'] = 'success';
    $response['uploaded'] = $uploaded;
    $response['failed'] = $failed;

} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
} finally {
    if (isset($conn)) {
        $conn->close();
    }
    echo json_encode($response);
}
