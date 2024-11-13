import pandas as pd
from collections import Counter

# Path to your CSV file
csv_file_path = 'C:\\Users\\Krissy\\Bootcamp\\Project3-PhillyFood\\yelp_academic_dataset.csv'

# Load the CSV data into a DataFrame
df = pd.read_csv(csv_file_path, encoding='iso-8859-1')

# Display the DataFrame to ensure it is loaded correctly
print(df.head())

# Print the column names to ensure they are correct
print(df.columns)

# Filter out rows where 'Categories' is NaN
df = df.dropna(subset=['Categories'])

# Create a DataFrame with 'postal_code' and 'Categories'
df = df[['postal_code', 'Categories']]

# Split categories and explode into separate rows
df['Categories'] = df['Categories'].str.split(', ')
df = df.explode('Categories')

# Function to get the top 3 most common categories
def get_top_three(counter):
    most_common = counter.most_common(3)
    return [category for category, count in most_common]

# Group by postal code and get the top 3 most common cuisines
top_three_cuisines = df.groupby('postal_code')['Categories'].apply(lambda x: get_top_three(Counter(x)))

# Create a DataFrame for the results
df_top_three = top_three_cuisines.reset_index()
df_top_three.columns = ['postal_code', 'top_three_cuisines']

# Split the top three cuisines into separate columns
df_top_three[['most_common_cuisine', 'second_most_common_cuisine', 'third_most_common_cuisine']] = pd.DataFrame(df_top_three['top_three_cuisines'].tolist(), index=df_top_three.index)

# Drop the temporary column
df_top_three = df_top_three.drop(columns=['top_three_cuisines'])

# Display the results
print(df_top_three.head())

# Path to the output JSON file
output_json_file_path = 'C:\\Users\\Krissy\\Bootcamp\\Project3-PhillyFood\\top_three_cuisines_by_zip.json'

# Save the DataFrame to a JSON file
df_top_three.to_json(output_json_file_path, orient='records')

print(f"Top three cuisines data saved to {output_json_file_path}")