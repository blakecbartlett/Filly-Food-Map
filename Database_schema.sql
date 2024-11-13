-- create table schema for tables 
create table cheesesteak_restaurants (
	location varchar(50) not null primary key,
	reviews int,
	ratings float,
	cost float,
	value float
);

create table yelp_restaurants (
	business_id varchar(50) not null primary key,
	name varchar(50) not null,
	address varchar(100) not null,
	city varchar(30) not null,
	state varchar(30) not null,
	postal_code int,
	latitude float not null,
	longitude float,
	stars real,
	review_count int,
	attributes JSONB,
	Categories varchar(100),
	price_rating int
);

-- Adjusts data type of values in attributes column in the yelp_restaurants table
ALTER TABLE yelp_restaurants ALTER COLUMN attributes TYPE TEXT;


-- Imports data into database
COPY yelp_restaurants (
  business_id,
  name,
  address,
  city,
  state,
  postal_code,
  latitude,
  longitude,
  stars,
  review_count,
  attributes,
  categories,
  price_rating
) FROM '/Users/michael/Bootcamp Repos/Project3-PhillyFood/yelp_academic_dataset_with_price_rating.csv' 
CSV HEADER;
