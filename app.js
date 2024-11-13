document.addEventListener('DOMContentLoaded', () => {
    var modal = document.getElementById('imageModal');
    var modalImg = document.getElementById('modalImage');
    var closeBtn = document.getElementsByClassName('close')[0];
    const map = L.map('map').setView([39.9926, -75.1652], 12);
    let geojsonLayer, restaurantLayerGroup, reviewLayer;
    let cuisineLegend, restaurantLegend, reviewLegend;
    let cuisineData = [];
    let categories = [];
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    function initializeLegends() {
        cuisineLegend = createCuisineLegend();
        restaurantLegend = createRestaurantLegend();
        reviewLegend = createReviewLegend();
    }

    function createCuisineLegend() {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            const cuisines = ['African', 'American', 'Bakery', 'BBQ', 'Cheesesteaks', 'Chinese', 'European', 'Indian', 'Italian', 'Japanese', 'Jewish', 'Korean', 'Mexican', 'Middle Eastern', 'SE Asian'];
            
            div.innerHTML = '<h4>Most Common Cuisine by Zipcode</h4>';
            cuisines.forEach(cuisine => {
                div.innerHTML += `<i style="background:${getColor(cuisine)}"></i> ${cuisine}<br>`;
            });
            div.innerHTML += '<br><strong>Note:</strong> Zip codes 19137, 19133, 19141, and 19109 had no restaurants listed in the dataset.';
            
            return div;
        };
        return legend;
    }

    function createRestaurantLegend() {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<h4>Restaurant Map</h4>';
            div.innerHTML += '<label><input type="checkbox" id="select-all" checked> Select All</label><br>';
            categories.forEach(category => {
                div.innerHTML += `<label><input type="checkbox" class="category-filter" value="${category}" checked> ${category}</label><br>`;
            });
            return div;
        };
        return legend;
    }

    function createReviewLegend() {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            const grades = [0, 200, 400, 600, 800, 1000, 1200];
            
            div.innerHTML = '<h4>Average Reviews</h4>';
            grades.forEach((grade, index) => {
                const from = grade;
                const to = grades[index + 1];
                div.innerHTML += 
                    `<i style="background:${getReviewColor(from + 1)}"></i> ${from}${to ? '&ndash;' + to : '+'}<br>`;
            });
            
            return div;
        };
        return legend;
    }

    function getColor(cuisine) {
        const colorMap = {
            'African': '#C0392B', 'American': '#2980B9', 'Bakery': '#AAFF00',
            'BBQ': '#EE4B2B', 'Cheesesteaks': '#e28743', 'Chinese': '#76448A',
            'European': '#B7950B', 'Indian': '#148F77', 'Italian': '#B03A2E',
            'Japanese': '#1D8348', 'Jewish': '#21618C', 'Korean': '#FFBF00',
            'Mexican': '#DE3163', 'Middle Eastern': '#C9CC3F', 'SE Asian': '#DA70D6'
        };
        return colorMap[cuisine] || '#B2BEB5';
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
        const cuisineInfo = cuisineData.find(d => d.postal_code == feature.properties.CODE);
        const cuisine = cuisineInfo ? cuisineInfo.most_common_cuisine : 'Unknown';
        return {
            fillColor: getColor(cuisine),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    }

    function loadGeoJSON() {
        return fetch('Static/Zipcodes_Poly.geojson')
            .then(response => response.json())
            .catch(error => console.error('Error loading GeoJSON data:', error));
    }

    function loadCuisineData() {
        return fetch('Static/top_three_cuisines_by_zip.json')
            .then(response => response.json())
            .catch(error => console.error('Error loading JSON data:', error));
    }

    function loadCSVData() {
        return d3.csv('Static/yelp_academic_dataset.csv')
            .catch(error => console.error("Error loading CSV data:", error));
    }

    function createGeojsonLayer(geojson) {
        return L.geoJson(geojson, {
            style: style,
            onEachFeature: function (feature, layer) {
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                    click: zoomToFeature
                });
            }
        });
    }

    function processCSVData(data) {
        categories = [...new Set(data.map(d => d.Categories))].filter(c => c);
        return data.map(row => ({
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
    }

    function createFoodLayers(foodData) {
        const foodLayers = {};
        const colors = [
            "#8B0000", "#00008B", "#006400", "#0000CD", "#B22222", "#228B22", "#483D8B", "#8B4513",
            "#2E8B57", "#8A2BE2", "#A52A2A", "#5F9EA0", "#8B008B", "#2F4F4F", "#4B0082"
        ];

        categories.forEach((category, i) => {
            const color = colors[i % colors.length];
            const icon = L.divIcon({
                html: `<i class="fa fa-cutlery" style="color:${color}; font-size: 20px;"></i>`,
                className: 'custom-div-icon',
                iconSize: [40, 56],
                iconAnchor: [20, 56]
            });

            const filteredData = foodData.filter(d => d.properties.category === category);
            foodLayers[category] = L.geoJSON(filteredData, {
                pointToLayer: (feature, latlng) => L.marker(latlng, { icon: icon }),
                onEachFeature: onEachFeature
            });
        });

        return foodLayers;
    }

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

    function initializeLayers(foodLayers) {
        restaurantLayerGroup = L.layerGroup(Object.values(foodLayers));

        return fetch('Static/merged_geojson.json')
            .then(response => response.json())
            .then(data => {
                reviewLayer = createReviewLayer(data);
                setupLayerControl(foodLayers);
            })
            .catch(error => console.error('Error loading merged GeoJSON data:', error));
    }

    function createReviewLayer(data) {
        return L.geoJson(data, {
            style: function(feature) {
                return {
                    fillColor: getReviewColor(feature.properties.average_review_count),
                    weight: 0.5,
                    opacity: 1,
                    color: 'black',
                    dashArray: '',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function (feature, layer) {
                layer.bindTooltip(`<b>Neighborhood:</b> ${feature.properties.name}<br>
                    <b>Average Reviews:</b> ${feature.properties.average_review_count}<br>
                    <b>Restaurant Count:</b> ${feature.properties.restaurant_count}`);
            }
        });
    }

    function setupLayerControl(foodLayers) {
        const baseMaps = {
            "Cuisine by Zip Code": geojsonLayer,
            "Restaurant Map": restaurantLayerGroup,
            "Heat Map by Neighborhood": reviewLayer
        };

        L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

        geojsonLayer.addTo(map);
        cuisineLegend.addTo(map);

        map.on('baselayerchange', function(event) {
            map.removeControl(cuisineLegend);
            map.removeControl(restaurantLegend);
            map.removeControl(reviewLegend);

            if (event.name === "Restaurant Map") {
                map.addLayer(restaurantLayerGroup);
                restaurantLegend.addTo(map);
                addCategoryFilters(foodLayers);
            } else if (event.name === "Cuisine by Zip Code") {
                map.addLayer(geojsonLayer);
                cuisineLegend.addTo(map);
            } else if (event.name === "Heat Map by Neighborhood") {
                map.addLayer(reviewLayer);
                reviewLegend.addTo(map);
            }
        });
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

                selectAllCheckbox.checked = selectedCategories.length === categoryCheckboxes.length;
            });
        });
    }

    function highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        const cuisineInfo = cuisineData.find(d => d.postal_code == layer.feature.properties.CODE);
        const first = cuisineInfo ? cuisineInfo.most_common_cuisine : 'Unknown';
        const second = cuisineInfo && cuisineInfo.second_most_common_cuisine ? cuisineInfo.second_most_common_cuisine : 'N/A';
        const third = cuisineInfo && cuisineInfo.third_most_common_cuisine ? cuisineInfo.third_most_common_cuisine : 'N/A';
        const popupContent = `
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

    // Main execution
    Promise.all([loadGeoJSON(), loadCuisineData(), loadCSVData()])
        .then(([geojson, cuisine, csvData]) => {
            cuisineData = cuisine;
            geojsonLayer = createGeojsonLayer(geojson);
            const foodData = processCSVData(csvData);
            const foodLayers = createFoodLayers(foodData);
            initializeLegends();
            return initializeLayers(foodLayers);
        })
        .catch(error => console.error('Error in initialization:', error));

    // Get all thumbnail items except the first one (map_home)
    var thumbnails = Array.from(document.querySelectorAll('.thumbnail-item')).slice(1);

    thumbnails.forEach(function(thumbnail) {
        thumbnail.addEventListener('click', function() {
            var imgSrc = this.querySelector('img').src;
            modal.style.display = 'block';
            modalImg.src = imgSrc;
        });
    });

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
});