document.addEventListener('DOMContentLoaded', () => {
    var map = L.map('map').setView([39.9926, -75.1652], 12);
    var geojsonLayer, restaurantLayers = {}, reviewLayer;
    var cuisineLegend, restaurantLegend, reviewLegend;
    var cuisineData = [];
    var categories = []; // To store categories
    var restaurantLayerGroup;


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    function initializeLegends() {
        cuisineLegend = L.control({ position: 'bottomright' });
        cuisineLegend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend'),
                cuisines = ['African', 'American', 'Bakery', 'BBQ', 'Cheesesteaks', 'Chinese', 'European', 'Indian', 'Italian', 'Japanese', 'Jewish', 'Korean', 'Mexican', 'Middle Eastern', 'SE Asian'],
                labels = [];

            div.innerHTML += '<h4>Most Common Cuisine by Zipcode</h4>';

            for (var i = 0; i < cuisines.length; i++) {
                div.innerHTML += '<i style="background:' + getColor(cuisines[i]) + '"></i> ' + cuisines[i] + '<br>';
            }

            div.innerHTML += '<br><strong>Note:</strong> Zip codes 19137, 19133, 19141, and 19109 had no restaurants listed in the dataset.';

            return div;
        };

        restaurantLegend = L.control({ position: 'bottomright' });
        restaurantLegend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += '<h4>Restaurant Map</h4>';
            div.innerHTML += '<label><input type="checkbox" id="select-all" checked> Select All</label><br>'; // Add Select All checkbox
            categories.forEach(category => {
                div.innerHTML += `<label><input type="checkbox" class="category-filter" value="${category}" checked> ${category}</label><br>`;
            });
            return div;
        };

        reviewLegend = L.control({ position: 'bottomright' });
        reviewLegend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 200, 400, 600, 800, 1000, 1200],
                labels = [],
                from, to;

            div.innerHTML += '<h4>Average Reviews</h4>'; // Add a title to the legend

            for (var i = 0; i < grades.length; i++) {
                from = grades[i];
                to = grades[i + 1];

                labels.push(
                    '<i style="background:' + getReviewColor(from + 1) + '"></i> ' +
                    from + (to ? '&ndash;' + to : '+'));
            }
            div.innerHTML += labels.join('<br>');
            return div;
        }
    }

    function getColor(cuisine) {
        switch (cuisine) {
            case 'African': return '#C0392B';
            case 'American': return '#2980B9';
            case 'Bakery': return '#AAFF00';
            case 'BBQ': return '#EE4B2B';
            case 'Cheesesteaks': return '#e28743';
            case 'Chinese': return '#76448A';
            case 'European': return '#B7950B';
            case 'Indian': return '#148F77';
            case 'Italian': return '#B03A2E';
            case 'Japanese': return '#1D8348';
            case 'Jewish': return '#21618C';
            case 'Korean': return '#FFBF00';
            case 'Mexican': return '#DE3163';
            case 'Middle Eastern': return '#C9CC3F';
            case 'SE Asian': return '#DA70D6';
            default: return '#B2BEB5';
        }
    }

    function getReviewColor(d) {
        return d > 1200 ? '#800026' :
               d > 1000 ? '#BD0026' :
               d > 800  ? '#E31A1C' :
               d > 600  ? '#FC4E2A' :
               d > 400  ? '#FD8D3C' :
               d > 200  ? '#FEB24C' :
               d > 0    ? '#FFEDA0' :
                          '#B2BEB5';
    }

    function style(feature) {
        var cuisine = 'Unknown';
        if (cuisineData) {
            var cuisineInfo = cuisineData.find(d => d.postal_code == feature.properties.CODE);
            cuisine = cuisineInfo ? cuisineInfo.most_common_cuisine : 'Unknown';
        }
        return {
            fillColor: getColor(cuisine),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    }

    fetch('Static/Zipcodes_Poly.geojson')
        .then(response => response.json())
        .then(geojson => {
            console.log("GeoJSON Data Loaded:", geojson);

            loadCuisineData(geojson);
        })
        .catch(error => console.error('Error loading GeoJSON data:', error));

    function loadCuisineData(geojson) {
        fetch('Static/top_three_cuisines_by_zip.json')
            .then(response => response.json())
            .then(data => {
                console.log("Cuisine Data Loaded:", data);
                cuisineData = data;

                // Create the geojsonLayer after the cuisine data is loaded
                geojsonLayer = L.geoJson(geojson, {
                    style: style,
                    onEachFeature: function (feature, layer) {
                        layer.on({
                            mouseover: highlightFeature,
                            mouseout: resetHighlight,
                            click: zoomToFeature
                        });
                    }
                }).addTo(map);

                cuisineLegend.addTo(map);  // Add the initial legend
                loadCSVData();
            })
            .catch(error => console.error('Error loading JSON data:', error));
    }

    function loadCSVData() {
        let csvUrl = 'Static/yelp_academic_dataset.csv';
        d3.csv(csvUrl).then(function(data) {
            createFeatures(data);
            console.log("CSV data loaded:", data);

            if (data.length > 0) {
                console.log("CSV data keys:", Object.keys(data[0]));
            }

            categories = [...new Set(data.map(d => d.Categories))].filter(c => c); // Store categories globally
            console.log("Categories extracted:", categories);
            let geoData = data.map(row => ({
                type: "Feature",
                properties: {
                    name: row.name,
                    category: row.Categories,
                    stars: row.stars
                },
                geometry: {
                    type: "Point",
                    coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
                }
            }));

            console.log("GeoJSON data created:", geoData);
            createFeatures(geoData, categories);
        }).catch(function(error) {
            console.error("Error loading CSV data:", error);
        });
    }

    function createFeatures(foodData, categories) {
        console.log("Creating features...");
        console.log("Food Data:", foodData);

        function onEachFeature(feature, layer) {
            const tooltipContent = `<h3>${feature.properties.name}</h3><p>Category: ${feature.properties.category}</p><p>Stars: ${feature.properties.stars}</p>`;
            layer.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'top',
                offset: [0, -10],
                opacity: 0.8,
            });

            layer.on('mouseover', function (e) {
                this.openTooltip();
            });

            layer.on('mouseout', function (e) {
                this.closeTooltip();
            });
        }
    
        let foodLayers = {};
        let colors = [
            "#8B0000", "#00008B", "#006400", "#0000CD", "#B22222", "#228B22", "#483D8B", "#8B4513",
            "#2E8B57", "#8A2BE2", "#A52A2A", "#5F9EA0", "#8B008B", "#2F4F4F", "#4B0082"
        ];

        categories.forEach((category, i) => {
            let color = colors[i % colors.length];
            console.log(`Processing category: ${category} with color ${color}`);

            let icon = L.divIcon({
                html: `<i class="fa fa-cutlery" style="color:${color}; font-size: 20px;"></i>`,
                className: 'custom-div-icon',
                iconSize: [40, 56],
                iconAnchor: [20, 56]
            });

            let filteredData = foodData.filter(d => d.properties.category === category);
            console.log(`Filtered Data for ${category}:`, filteredData);

            foodLayers[category] = L.geoJSON(filteredData, {
                pointToLayer: function(feature, latlng) {
                    return L.marker(latlng, { icon: icon });
                },
                onEachFeature: onEachFeature
            });
        });

        console.log("Food layers created:", foodLayers);
        initializeLayers(foodLayers, colors, categories);
    }

    function initializeLayers(foodLayers, colors, categories) {
        console.log("Initializing layers...");

        restaurantLayerGroup = L.layerGroup(Object.values(foodLayers));

        // Load the merged GeoJSON data for reviews
        fetch('Static/merged_geojson.json')
            .then(response => response.json())
            .then(data => {
                // Get the range of average review counts
                let averageReviewCounts = data.features.map(f => f.properties.average_review_count);
                let maxReviewCount = Math.max(...averageReviewCounts);
                let minReviewCount = Math.min(...averageReviewCounts);
      
                // Define the style for the choropleth
                function style(feature) {
                    return {
                        fillColor: getReviewColor(feature.properties.average_review_count),
                        weight: 0.5,
                        opacity: 1,
                        color: 'black',
                        dashArray: '',
                        fillOpacity: 0.7
                    };
                }
                
                // Add the GeoJSON layer for reviews
                reviewLayer = L.geoJson(data, {
                    style: style,
                    onEachFeature: function (feature, layer) {
                        layer.bindTooltip('<b>Neighborhood:</b> ' + feature.properties.name + '<br>' +
                            '<b>Average Reviews:</b> ' + feature.properties.average_review_count + '<br>' +
                            '<b>Restaurant Count:</b> ' + feature.properties.restaurant_count);
                    }
                });

                let baseMaps = {
                    "Cuisine by Zip Code": geojsonLayer,
                    "Restaurant Map": restaurantLayerGroup,
                    "Heat Map by Neighborhood": reviewLayer
                };

                let control = L.control.layers(baseMaps, null, {
                    collapsed: false
                }).addTo(map);

                // Initially add geojsonLayer to the map
                geojsonLayer.addTo(map);
                cuisineLegend.addTo(map);  // Add the initial legend

                map.on('baselayerchange', function(event) {
                    map.removeControl(cuisineLegend);
                    map.removeControl(restaurantLegend);
                    map.removeControl(reviewLegend);

                    if (event.name === "Restaurant Map") {
                        map.addLayer(restaurantLayerGroup);
                        restaurantLegend.addTo(map);
                        addCategoryFilters(foodLayers); // Call addCategoryFilters when Restaurant Map is selected
                    } else if (event.name === "Cuisine by Zip Code") {
                        map.addLayer(geojsonLayer);
                        cuisineLegend.addTo(map);
                    } else if (event.name === "Heat Map by Neighborhood") {
                        map.addLayer(reviewLayer);
                        reviewLegend.addTo(map);
                    }
                });

                // Set initial layer and legend
                document.getElementById('cuisine').checked = true;
                map.addLayer(geojsonLayer);
                cuisineLegend.addTo(map);
            })
            .catch(error => console.error('Error loading merged GeoJSON data:', error));
        }

        function addCategoryFilters(foodLayers) {
            const selectAllCheckbox = document.getElementById('select-all');
            const categoryCheckboxes = document.querySelectorAll('.category-filter');
    
            selectAllCheckbox.addEventListener('change', function () {
                const isChecked = this.checked;
                categoryCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
    
                Object.keys(foodLayers).forEach(category => {
                    if (isChecked) {
                        map.addLayer(foodLayers[category]);
                    } else {
                        map.removeLayer(foodLayers[category]);
                    }
                });
            });
    
            categoryCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function () {
                    const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked')).map(cb => cb.value);
    
                    Object.keys(foodLayers).forEach(category => {
                        if (selectedCategories.includes(category)) {
                            map.addLayer(foodLayers[category]);
                        } else {
                            map.removeLayer(foodLayers[category]);
                        }
                    });
    
                    if (selectedCategories.length === categoryCheckboxes.length) {
                        selectAllCheckbox.checked = true;
                    } else {
                        selectAllCheckbox.checked = false;
                    }
                });
            });
        }

        function highlightFeature(e) {
            var layer = e.target;
            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
            });
    
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
    
            var cuisine = 'Unknown';
            if (cuisineData) {
                var cuisineInfo = cuisineData.find(d => d.postal_code == layer.feature.properties.CODE);
                cuisine = cuisineInfo ? cuisineInfo.most_common_cuisine : 'Unknown';
            }
            var first = cuisineInfo ? cuisineInfo.most_common_cuisine : 'Unknown';
            var second = cuisineInfo && cuisineInfo.second_most_common_cuisine ? cuisineInfo.second_most_common_cuisine : 'N/A';
            var third = cuisineInfo && cuisineInfo.third_most_common_cuisine ? cuisineInfo.third_most_common_cuisine : 'N/A';
            var popupContent = `
                <b>Zip Code: ${layer.feature.properties.CODE}</b><br>
                1st Most Common: ${first}<br>
                2nd Most Common: ${second}<br>
                3rd Most Common: ${third}
            `;
            layer.bindPopup(popupContent).openPopup();
        }
    
        function resetHighlight(e) {
            geojsonLayer.resetStyle(e.target);
            e.target.closePopup();
        }
    
        function zoomToFeature(e) {
            map.fitBounds(e.target.getBounds());
        }
    
        initializeLegends();
    
        // Radio button change event
        document.querySelectorAll('input[name="layer"]').forEach(radio => {
            radio.addEventListener('change', function() {
                map.eachLayer(layer => {
                    if (layer !== geojsonLayer && layer !== restaurantLayerGroup && layer !== reviewLayer) {
                        map.removeLayer(layer);
                    }
                });
                map.removeControl(cuisineLegend);
                map.removeControl(restaurantLegend);
                map.removeControl(reviewLegend);
    
                if (this.value === 'cuisine') {
                    map.addLayer(geojsonLayer);
                    cuisineLegend.addTo(map);
                } else if (this.value === 'restaurant') {
                    map.addLayer(restaurantLayerGroup);
                    restaurantLegend.addTo(map);
                    addCategoryFilters(foodLayers);
                } else if (this.value === 'review') {
                    map.addLayer(reviewLayer);
                    reviewLegend.addTo(map);
                }
            });
        });
    
        // Set initial layer and legend
        document.getElementById('cuisine').checked = true;
        map.addLayer(geojsonLayer);
        cuisineLegend.addTo(map);
    });