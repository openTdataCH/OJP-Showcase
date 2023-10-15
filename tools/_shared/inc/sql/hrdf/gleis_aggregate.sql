SELECT 
	gleis_classification_key, 
	COUNT(*) AS rows_no,
	GROUP_CONCAT(
        PRINTF('%s|%s|%s', row_idx, gleis_stop_info_id, gleis_time)
        ,' -- '
    ) AS gleis_data
FROM gleis_classification
GROUP BY gleis_classification_key