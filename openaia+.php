<?php

ini_set('max_execution_time', 0);
set_time_limit(0);

if (php_sapi_name() !== 'cli') {
    die('Run this script via CLI for long execution.');
}
require_once __DIR__ . '/../vendor/autoload.php';

$pdf = new TCPDF();
$logFile = __DIR__ . '/app.log';

function aiTextToPdfHtml(string $aiText): string
{
    // Basic cleanup
    $safeText = htmlspecialchars($aiText, ENT_QUOTES, 'UTF-8');

    // Convert Markdown-style tables to HTML tables
    $lines = explode("\n", $safeText);

    $html = '<style>
        table { border-collapse: collapse; width: 100%; font-size: 10px; }
        th { background-color: #f2f2f2; font-weight: bold; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        h2 { margin-top: 20px; }
    </style>';

    $inTable = false;

    foreach ($lines as $line) {
        if (preg_match('/^\|(.+)\|$/', trim($line))) {
            if (!$inTable) {
                $html .= '<table>';
                $inTable = true;
            }

            $cells = array_map('trim', explode('|', trim($line, '|')));
            $html .= '<tr>';

            foreach ($cells as $cell) {
                $html .= '<td>' . $cell . '</td>';
            }

            $html .= '</tr>';
        } else {
            if ($inTable) {
                $html .= '</table>';
                $inTable = false;
            }

            if (trim($line) !== '') {
                $html .= '<p>' . $line . '</p>';
            }
        }
    }

    if ($inTable) {
        $html .= '</table>';
    }

    return $html;
}

function markdownTableToHtml(string $text): string
{
    $lines = array_filter(array_map('trim', explode("\n", $text)));
    $html = '';

    $tableStarted = false;

    foreach ($lines as $line) {

        // Detect table row
        if (preg_match('/^\|.*\|$/', $line)) {

            // Skip separator row (---|---)
            if (preg_match('/^\|\s*-+/', $line)) {
                continue;
            }

            if (!$tableStarted) {
                $html .= '
                <table cellpadding="6" cellspacing="0" border="1" width="100%">
                    <thead>
                ';
                $tableStarted = true;
            }

            $cells = array_map('trim', explode('|', trim($line, '|')));

            if (strpos($html, '</thead>') === false) {
                $html .= '<tr>';
                foreach ($cells as $cell) {
                    $html .= '<th style="background-color:#f2f2f2;">' . htmlspecialchars($cell) . '</th>';
                }
                $html .= '</tr></thead><tbody>';
            } else {
                $html .= '<tr>';
                foreach ($cells as $cell) {
                    $html .= '<td>' . htmlspecialchars($cell) . '</td>';
                }
                $html .= '</tr>';
            }

        } else {
            if ($tableStarted) {
                $html .= '</tbody></table><br>';
                $tableStarted = false;
            }

            $html .= '<p>' . htmlspecialchars($line) . '</p>';
        }
    }

    if ($tableStarted) {
        $html .= '</tbody></table>';
    }

    return $html;
}

function logMessage(string $label, array $data): void
{
    $logFile = __DIR__ . '/app.log';

    $entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'label'     => $label,
        'data'      => $data,
    ];

    file_put_contents(
        $logFile,
        json_encode($entry, JSON_PRETTY_PRINT) . PHP_EOL,
        FILE_APPEND
    );
}


function resizeImage($src, $dest, $width, $height) {
    $info = getimagesize($src);
    $mime = $info['mime'];

    switch ($mime) {
        case 'image/png':
            $image = imagecreatefrompng($src);
            break;
        case 'image/jpeg':
            $image = imagecreatefromjpeg($src);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($src);
            break;
        default:
            die('Unsupported image type');
    }

    $resized = imagecreatetruecolor($width, $height);

    imagecopyresampled(
        $resized,
        $image,
        0, 0, 0, 0,
        $width, $height,
        imagesx($image),
        imagesy($image)
    );

    imagepng($resized, $dest);

    imagedestroy($image);
    imagedestroy($resized);
}
$openaiApiKey = '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';


// Path to your uploaded product image
$imagePath = __DIR__ . '/DSC_9404.jpg';

if (!file_exists($imagePath)) {
    die('Image file not found');
}

$imageFile = new CURLFile(
    $imagePath,
    'image/jpeg',   // ✅ required
    'DSC_9404.jpg'
);

logMessage('INFO', ['imagePath' => $imagePath]);
// Convert image to base64
$imageBase64 = base64_encode(file_get_contents($imagePath));


$prompt = <<<PROMPT

I will upload a product image.
Using that exact image as the base, generate 2–3 different realistic images of the product.
IMAGE REQUIREMENTS
Images must look 100% realistic — not artificial or AI-generated.
Use the product in different real-life contexts, angles, and environments.
Keep the product’s exact shape, color, branding, proportions, and details unchanged.
Follow Amazon A+ Content style:
clean
premium
lifestyle usage
professional lighting
studio-quality finish
You may include these types of shots:
product in-use
lifestyle background
clean enhanced studio shot
close-up detail
hero image

HANDMADE / HANDCRAFTED REALISM (IF APPLICABLE)
If the product is handmade or handcrafted, the images must clearly reflect a human touch.

Show subtle, natural imperfections such as hand-finished textures, slight asymmetry, organic material variations, stitching or brush inconsistencies, and warm natural lighting.

The product should not look machine-perfect or factory-polished.
Where suitable, include gentle human interaction (hands using, holding, arranging, or working with the product) to emphasize craftsmanship, scale, and authenticity—without distracting from the product.

TEXT ADDITION REQUIREMENTS
In some images, add short, clean, elegant text.
Text must be relevant to the product or its use-case (features, benefits, or context).
Place text naturally, only in areas where it does not look forced, cluttered, or awkward.
Text styling must follow Amazon A+ Content standards:
minimal
modern
clean
highly readable
Do not cover, alter, or overlap the product.
Do not add fake claims or unrealistic elements.
ENHANCEMENT RULES
Enhance clarity, lighting, and realism only.
Do not distort, reshape, or modify the actual product.
Backgrounds must be photorealistic, not 3D, illustrated, or cartoon-style.
Final images must look like they were shot using a professional DSLR or mirrorless camera.
IMAGE SIZE COMPLIANCE (STRICT)
The generated images must strictly follow the exact image dimensions (in pixels) provided by the user.

Do not resize, crop, pad, stretch, upscale, or alter the aspect ratio.

Output the images in the exact pixel size specified, with zero deviation.

OUTPUT
Generate 2–3 final realistic images based on the uploaded product picture.

PROMPT;

$ch = curl_init("https://api.openai.com/v1/images/edits");


if (!$ch instanceof CurlHandle) {
    die('curl_init() failed – cURL handle is null');
}


curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {$openaiApiKey}"
]);
// IMPORTANT: multipart/form-data via CURLFile
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'model'  => 'gpt-image-1',
    'prompt' => $prompt,
    'size'   => '1024x1024', // ✅ supported
    'n'      => 3,
    'image'  => $imageFile
]);


$response = curl_exec($ch);

if (curl_errno($ch)) {
    die("cURL Error: " . curl_error($ch));
}
unset($ch);

$result = json_decode($response, true);

// Debug if empty
if (empty($result['data'])) {
    echo "API Response:\n";
    print_r($result);
    exit;
}

// Save images
foreach ($result['data'] as $i => $img) {
    $imageData = base64_decode($img['b64_json']);
    file_put_contents(__DIR__ . "/output_image_" . ($i + 1) . ".png", $imageData);
}

resizeImage('output_image_1.png', 'final_220x220_1.png', 220, 220);

echo "Images generated successfully.\n";







