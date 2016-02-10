<?php

header("Content-Type: application/json", true);

$totalPages = 3;
$page = 1;

if(isset($_GET['page'])) {
    $page = $_GET['page'];
}

$nextPage = $page + 1;
$nextPageUrl = 'server.php?page=' . $nextPage;

if($nextPage > $totalPages) {
    $nextPageUrl = null;
}

$data = [];

$names = [
    "Test", "Ted", "Tom", "Space", "World", "Sky", "Day", "Sun", "Cloud", "Infinitum"
];

for ($i = 0; $i < 24; $i++) {
    $name = $names[rand(0, 9)];

    $data[] = [
		'title' => $name,
        'text' => [
            'body' => uniqid()
        ],
		'image' => 'http://lorempixel.com/1920/1080/?' . uniqid()
	];
}

$response = [
    'data' => $data,
	'next_page' => $nextPageUrl,
	'total_pages' => $totalPages
];

echo json_encode($response);