# Import dependencies
from config import DB_CONFIG
import csv
import psycopg2
from sqlalchemy import create_engine, text

# Use the credentials to create connection string
connection_string = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"

# Start SQLAlchemy engine
engine = create_engine(connection_string)

# Connect to engine
with engine.connect() as conn:
    
    # Execute query to extract all data from yelp_restaurants
    yelp_query = text('SELECT * FROM yelp_restaurants')
    yelp_result = conn.execute(yelp_query)
    yelp_path = 'yelp_academic_dataset1.csv'

    # Write the data to a csv file
    with open(yelp_path, 'w', newline='') as yelp_file:
        csv_writer = csv.writer(yelp_file)
        csv_writer.writerow(yelp_result.keys())
        csv_writer.writerows(yelp_result)

    # Execute query to extract all data from cheesesteak_restaurants
    cheesesteak_query = text('SELECT * FROM cheesesteak_restaurants')
    cheesesteak_result = conn.execute(cheesesteak_query)
    cheesesteak_path = 'Philly_cheesesteak_data1.csv'

    # Write the data to a csv file
    with open(cheesesteak_path, 'w', newline='') as file:
        csv_writer = csv.writer(file)
        csv_writer.writerow(cheesesteak_result.keys())
        csv_writer.writerows(cheesesteak_result)