<?php

header("Content-Type: application/json", true);

$data = [];

for ($i = 0; $i < 24; $i++)
{
	$data[] = [
		'test' => 'Ted',
		'image' => 'https://upload.wikimedia.org/wikipedia/commons/d/da/The_City_London.jpg'
	];
}

$response = [
    'data' => $data,
	'next_page' => 'server.php'
];

echo json_encode($response);