const csvs = ["ALL_MEDALISTS_modified.csv", "GDP_Data_Year_1_To_2008_modified.csv", "Population_Data_Year_1_To_2008_modified.csv", "NOC_CODES_modified.csv"];

Promise.all(csvs.map(file => d3.csv(file)))
  .then(function(dataArray) {
    // Global Assets /////////////////////////////////////////////////////////////////////////////////

    // The years we wish to make visualizations for
    years = ["1920", "1960", "2000"]

    // Colors of the points in the scatter plots
    colors = [ { id: "normal", color: "#000000"},
               { id: "host", color: "#4287f5"},
               { id: "non-host", color: "#DEDEDE"},
               { id: "average", color: "#000000"}]
    
    function color(id){
        return colors.find( d => d.id == id ).color
    }

    // Order of the dot types in the host scatter plot
    placementHierarchy = [ { id: "host", placement: 2},
                           { id: "non-host", placement: 0},
                           { id: "average", placement: 1}]

    function placement(id){
        return placementHierarchy.find( d => d.id == id ).placement
    }

    // Parse Data //////////////////////////////////////////////////////////////////////////////////////
    const rawOlympicData = dataArray[0]
    const rawGdpData = dataArray[1]
    const rawPopulationData = dataArray[2]
    const rawNocData = dataArray[3]

    // Process Data ///////////////////////////////////////////////////////////////////////////////////
    function processOlympicData()
    {
        let formattedData = [];
        const allYears = {};

        rawOlympicData.forEach(d => {
            if(!(d["Edition"] in allYears))
            {
            const newYear = {
                year: d["Edition"],
                host: d["HostNOC"],
                countryMedals: {}
            }
            allYears[d["Edition"]] = newYear;
            }
            if(d["NOC"] in allYears[d["Edition"]].countryMedals)
            { 
                allYears[d["Edition"]].countryMedals[d["NOC"]].medals = 
                allYears[d["Edition"]].countryMedals[d["NOC"]].medals + 1;
            }
            else if ( Object.values(d) != null && 
                        rawNocData.some(c => c["NOC"] == d["NOC"]) ) 
            {
                const newCountryMedal = {
                NOC: d["NOC"],
                medals: 1
                }
                allYears[d["Edition"]].countryMedals[d["NOC"]] = newCountryMedal;
            }
        })
        
        Object.keys(allYears).forEach(d => {
            formattedData.push(allYears[d]);
        })
        
        return formattedData;
    }

    olympicData = processOlympicData();

    function processPopulationData()
    {
        let populationData = [];
        
        years.forEach(year => {
            let data = [];
            let countryMedals = olympicData.find( c => c.year == year ).countryMedals;

            rawPopulationData.forEach(d => {
                if( d.NOC in countryMedals )
                { 
                let population = d[year];
                let medals = countryMedals[d.NOC].medals;
        
                if( population && medals )
                {
                    const dataPoint = {
                    NOC: d.NOC,
                    population: Number(population),
                    medals: medals,
                    id: "normal"
                    }
                    data.push(dataPoint);
                }
                }
            })

            const dataPoint = {
            year: year,
            data: data
            }
            populationData.push(dataPoint);
        })
        
        return populationData;
    }
    populationData = processPopulationData();

    function processGdpData()
    {
        let gdpData = [];
        
        years.forEach(year => {
            let data = [];
            let countryMedals = olympicData.find( c => c.year == year ).countryMedals;

            rawGdpData.forEach(d => {
                if( d.NOC in countryMedals )
                { 
                let gdp = d[year];
                let medals = countryMedals[d.NOC].medals;
        
                if( gdp && medals )
                {
                    const dataPoint = {
                    NOC: d.NOC,
                    gdp: Number(gdp),
                    medals: medals,
                    id: "normal"
                    }
                    data.push(dataPoint);
                }
                }
            })

            const dataPoint = {
            year: year,
            data: data
            }
            gdpData.push(dataPoint);
        })
        
        return gdpData;
    }

    gdpData = processGdpData();

    function processHostData(year){
        let hostData = [];

        olympicData.forEach(d => {
            let medal_sum = 0;
            
            Object.keys(d.countryMedals).forEach(c => {
                
                let id = d.countryMedals[c].NOC == d.host ? "host" : "non-host";
                medal_sum = d.countryMedals[c].NOC == d.host ? 
                            medal_sum : medal_sum + d.countryMedals[c].medals;
                
                const dataPoint = {
                NOC: d.countryMedals[c].NOC,
                year: d.year,
                medals: d.countryMedals[c].medals,
                id: id
                }
                hostData.push(dataPoint);
                
            })
            const dataPoint = {
                NOC: "average",
                year: d.year,
                medals: medal_sum / (Object.keys(d.countryMedals).length - 1),
                id: "average"
            }
            hostData.push(dataPoint);
        })
        return hostData;
    }
    hostData = processHostData();

    // Visualizations ////////////////////////////////////////////////////////////////////////////
    function makeScatterPlot(data, factor, year, i){
        // console.log(data)
        // measurements
        const margin = ({top: 100, right: 50, bottom: 50, left: 50});
        const height = 450;
        const width = 1300;

        // Create the svg
        const svg = d3.select(`#svg${i}`)
                        .append("svg")
                        .attr("viewBox", [0, 0, width, height])


        // Create the title
        svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", (margin.left + width - margin.right) / 2)
                .attr("y", margin.top / 2)
                .attr("font-weight", "bold")
                .style("font-size", "25px")
                .text(factor + " vs. medals won - " + year);
        
        // Create the x axis label
        svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", (margin.left + width - margin.right) / 2)
                .attr("y", height - 5)
                .attr("font-weight", "bold")
                .style("font-size", "15px")
                .text(factor);

        // Create the y axis label
        svg.append("text")
                .attr("text-anchor", "start")
                .attr("x", margin.left - 20)
                .attr("y", margin.top - 15)
                .attr("font-weight", "bold")
                .style("font-size", "15px")
                .text("medals won");

        minVal = d3.min(data, d => d[factor])
        if (d3.min(data, d => d[factor]) == 0) {
            minVal += 10
        }
        // Create the x axis
        const x = d3.scaleLog()
                    .domain([minVal, d3.max(data, d => d[factor])])
                    .range([margin.left, width - margin.right]); 
        // console.log(x(minVal))

        const xAxis = g => g
            .attr("transform", "translate(0," + (height - margin.bottom) + ")")
            .call(d3.axisBottom(x))
        svg.append("g")
            .call(xAxis)

        // Create the y axis
        const y = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d.medals)])
                    .rangeRound([height - margin.bottom, margin.top]);
        const yAxis = g => g
            .attr("transform", "translate(" + (margin.left) + ",0)")
            .call(d3.axisLeft(y))
        svg.append("g")
            .call(yAxis)

        for (const d of data) {
            if (x(d[factor]) == NaN){
                console.log(d[factor])
            }
        }

        // Create the dots
        svg.append("g")      
            .selectAll("dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", (d) => x(d[factor]) + 18)
            .attr("cy", (d) => y(d.medals))
            .attr("r", (d) =>  5)
            .style("fill", d => color(d.id));
        
        return svg.node();
    }

    // population plots
    console.log(populationData.find( c => c.year == years[0] ).data)
    populationPlot1920 = makeScatterPlot(populationData.find( c => c.year == years[0] ).data, "population", years[0], 1);
    populationPlot1960 = makeScatterPlot(populationData.find( c => c.year == years[1] ).data, "population", years[1], 2);
    populationPlot2000 = makeScatterPlot(populationData.find( c => c.year == years[2] ).data, "population", years[2], 3);

    // gdp plots
    gdpPlot1920 = makeScatterPlot(gdpData.find( c => c.year == years[0] ).data, "gdp", years[0], 4);
    gdpPlot1960 = makeScatterPlot(gdpData.find( c => c.year == years[1] ).data, "gdp", years[1], 5);
    gdpPlot2000 = makeScatterPlot(gdpData.find( c => c.year == years[2] ).data, "gdp", years[2], 6);


    // host plot
    function makeHostPlot(data, i){
        // measurements
        const margin = ({top: 100, right: 200, bottom: 40, left: 40});
        const height = 450;
        const width = 1300;

        // Sort data for placement
        data.sort(function(x, y){
                return d3.ascending(placement(x.id), placement(y.id));
        })

        // Filter data for lines
        const lineData = data.filter(d => ( d.id == "host" || d.id == "average"));
        var groupedLineData = d3.group(lineData, d => d.id);
        
        // Create the svg
        const svg = d3.select(`#svg${i}`)
                .append("svg")
                .attr("viewBox", [0, 0, width, height])

        // Create the title
        svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", (margin.left + width - margin.right) / 2)
                .attr("y", margin.top / 2)
                .attr("font-weight", "bold")
                .style("font-size", "25px")
                .text("Host Plot");
        
        // Create the x axis label
        svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", (margin.left + width - margin.right) / 2)
                .attr("y", height - 5)
                .attr("font-weight", "bold")
                .style("font-size", "15px")
                .text("year");

        // Create the y axis label
        svg.append("text")
                .attr("text-anchor", "start")
                .attr("x", margin.left - 20)
                .attr("y", margin.top - 15)
                .attr("font-weight", "bold")
                .style("font-size", "15px")
                .text("medals won");
        
        // Create the x axis
        const x = d3.scaleBand()
                    .domain(data.map(d => d.year))
                    .range([margin.left, width - margin.right]); 
        const xAxis = g => g
            .attr("transform", "translate(0," + (height - margin.bottom) + ")")
            .call(d3.axisBottom(x))
        svg.append("g")
            .call(xAxis)

        // Create the y axis
        const y = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d.medals)])
                    .rangeRound([height - margin.bottom, margin.top]);
        const yAxis = g => g
            .attr("transform", "translate(" + (margin.left) + ",0)")
            .call(d3.axisLeft(y))
        svg.append("g")
            .call(yAxis)

        // Create the dots
        svg.append("g")      
            .selectAll("dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", (d) => x(d.year) + 18)
            .attr("cy", (d) => y(d.medals))
            .attr("r", (d) =>  5)
            .style("fill", d => color(d.id));
        
        // Create the lines
        svg.append("g")      
            .selectAll("line")
            .data(groupedLineData)
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("stroke", d => color(d[0]))
            .attr("stroke-width", 1.5)
            .attr("d", d => {
                return d3.line()
                    .x(d => x(d.year) + 18)
                    .y(d => y(+d.medals))
                    (d[1])
                });

        // Legend
        let legend = ["host", "non-host", "average"]
        // Create the dots in the legend
        const size = 20
            svg.selectAll("legend")
            .data(legend)
            .join("circle")
                .attr("cx", width - margin.right + 20)
                .attr("cy", (d, i) => margin.top - 15 + i * (size + 5))
                .attr("r", 7)
                .style("fill", d => color(d))

        // Create the labels in the legend
        svg.selectAll("legend")
            .data(legend)
            .enter()
            .append("text")
                .attr("x", width - margin.right + 35)
                .attr("y", (d, i) => margin.top - 10 + i * (size + 5))
                .text(d => d)
                .attr("font-weight", "bold")
                .attr("text-anchor", "left")
                .style("font-size", "12px")
        
        return svg.node();
    }
    hostPlot = makeHostPlot(hostData, 7);

    // stream graph 
    function makeStreamGraph(data, i) {
        //Filtering Data for invalid rows
        const filtered = data.filter(d => d.Medal && d.Medal !== "NA");
        //totalling medals per country
        const totals = d3.rollups(filtered, v => v.length, d => d.NOC)
          .sort((a, b) => d3.descending(a[1], b[1]))
          .slice(0, 10)
          .map(d => d[0]);
      
        const years = Array.from(new Set(filtered.map(d => +d.Edition))).sort();
      
        // Reshaping Data for stream graph
        const streamData = years.map(year => {
          const row = { year };
          for (const noc of totals) {
            row[noc] = filtered.filter(d => +d.Edition === year && d.NOC === noc).length;
          }
          return row;
        });
        
        //Extract top 10
        const keys = Object.keys(streamData[0]).filter(k => k !== "year");
        const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle);
        const series = stack(streamData);

        //Dimensions
        const width = 1200;
        const height = 500;
        const margin = { top: 50, right: 200, bottom: 40, left: 60 };

        //Create svg
        const svg = d3.select(`#svg${i}`)
          .append("svg")
          .attr("viewBox", [0, 0, width, height]);
          
        //X scale (linear)
        const x = d3.scaleLinear()
          .domain(d3.extent(streamData, d => d.year))
          .range([margin.left, width - margin.right]);

        //Y scale (linear)
        const y = d3.scaleLinear()
          .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
          ])
          .range([height - margin.bottom, margin.top]);
          
        //Color Scheme
        const color = d3.scaleOrdinal()
          .domain(keys)
          .range(d3.schemeTableau10);
      
        //Generate area for stream graph + smoothing 
        const area = d3.area()
          .curve(d3.curveBasis)
          .x(d => x(d.data.year))
          .y0(d => y(d[0]))
          .y1(d => y(d[1]));
          
        //Draw layers
        svg.selectAll("path")
          .data(series)
          .join("path")
            .attr("fill", d => color(d.key))
            .attr("d", area)
          .append("title")
            .text(d => d.key);
          
        //Create x axis with labels
        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x).tickFormat(d3.format("d")))
          .attr("font-weight", "bold")
          .style("font-size", "15px");
          
        //Create y axis with no labels + ticks
        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(y).tickFormat("").tickSize(0))
          .select(".domain")
          .attr("stroke", "black");
          
        //Title
        svg.append("text")
          .attr("x", width / 6)
          .attr("y", margin.top - 10)
          .attr("font-weight", "bold")
          .style("font-size", "25px")
          .text("Olympic Medals by Country (Top 10 Stream Graph)");
          
        //Legend
        const legend = svg.append("g")
          .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);
      
        keys.forEach((key, i) => {
          const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
      
          row.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(key));
      
          row.append("text")
            .attr("x", 16)
            .attr("y", 10)
            .text(key)
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px");
        });
      }
    streamgraph = makeStreamGraph(rawOlympicData, 8);

  })
  .catch(function(error) {
    console.error("Error:", error);
  });
