UPDATE places
SET price_level = CASE
  WHEN price_level IS NOT NULL THEN price_level
  WHEN lower(coalesce(cuisine, '')) LIKE '%fine%' THEN 4
  WHEN lower(coalesce(cuisine, '')) LIKE '%steak%' THEN 4
  WHEN lower(coalesce(cuisine, '')) LIKE '%french%' THEN 4
  WHEN lower(coalesce(cuisine, '')) LIKE '%sushi%' THEN 3
  WHEN lower(coalesce(cuisine, '')) LIKE '%japanese%' THEN 3
  WHEN lower(coalesce(cuisine, '')) LIKE '%italian%' THEN 3
  WHEN lower(coalesce(cuisine, '')) LIKE '%indian%' THEN 2
  WHEN lower(coalesce(cuisine, '')) LIKE '%mexican%' THEN 2
  WHEN lower(coalesce(cuisine, '')) LIKE '%chinese%' THEN 2
  WHEN lower(coalesce(cuisine, '')) LIKE '%burger%' THEN 1
  WHEN lower(coalesce(cuisine, '')) LIKE '%takeout%' THEN 1
  WHEN lower(coalesce(cuisine, '')) LIKE '%delivery%' THEN 1
  ELSE 2
END
WHERE price_level IS NULL;
