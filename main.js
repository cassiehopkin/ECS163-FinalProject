// Datasets /////////////////////////////////////////////////////////////////////////////////
const csvs = [
  "data/ALL_MEDALISTS_modified.csv",
  "data/GDP_Data_Year_1_To_2008_modified.csv",
  "data/Population_Data_Year_1_To_2008_modified.csv",
  "data/NOC_CODES_modified.csv",
  "data/wiki_wars.csv",
];

Promise.all(csvs.map((file) => d3.csv(file)))
  .then(function (dataArray) {

    // Parse Data //////////////////////////////////////////////////////////////////////////////////////
    const rawOlympicData = dataArray[0];
    const rawGdpData = dataArray[1];
    const rawPopulationData = dataArray[2];
    const rawNocData = dataArray[3];
    const nocToCountry = {};
    rawNocData.forEach((d) => {
      nocToCountry[d.NOC] = d.Country;
    });

    // Process Data ///////////////////////////////////////////////////////////////////////////////////
    const nocMap = new Map(rawNocData.map((d) => [d.NOC, d.Country]));
    function formatPopulation(value) {
      return (value / 1000).toFixed(2) + " million";
    }

    // Create a data subset that contains the bronze, silver, and gold medals won by each
    // country, as well as the country that was hosting the games for a given year
    function processOlympicData() {
      let formattedData = [];
      const allYears = {};

      rawOlympicData.forEach((d) => {
        if (!(d.Edition in allYears)) {
          allYears[d.Edition] = {
            year: d.Edition,
            host: d.HostNOC,
            countryMedals: {},
          };
        }

        const country = allYears[d.Edition].countryMedals[d.NOC];
        if (country) {
          country.medals++;
          country.gold += d.Medal === "Gold" ? 1 : 0;
          country.silver += d.Medal === "Silver" ? 1 : 0;
          country.bronze += d.Medal === "Bronze" ? 1 : 0;
        } else if (rawNocData.some((c) => c.NOC === d.NOC)) {
          allYears[d.Edition].countryMedals[d.NOC] = {
            NOC: d.NOC,
            medals: 1,
            gold: d.Medal === "Gold" ? 1 : 0,
            silver: d.Medal === "Silver" ? 1 : 0,
            bronze: d.Medal === "Bronze" ? 1 : 0,
          };
        }
      });

      for (const year in allYears) {
        formattedData.push(allYears[year]);
      }

      return formattedData;
    }
    olympicData = processOlympicData();

    // Array of all years in which a summer Olympic games was held
    let years = [];
    olympicData.forEach((d) => {
      years.push(d.year);
    });

    // Create a data subset that contains the bronze, silver, and gold medals won by each
    // country, as well as that country's population for a given year
    function processPopulationData(olympicData) {
      return years.map((year) => {
        const countryMedals = olympicData.find(
          (c) => c.year == year
        ).countryMedals;
        const data = rawPopulationData
          .filter((d) => d.NOC in countryMedals)
          .map((d) => {
            const pop = d[year];
            const cm = countryMedals[d.NOC];
            return pop && cm
              ? {
                  NOC: d.NOC,
                  population: +pop,
                  medals: cm.medals,
                  gold: cm.gold,
                  silver: cm.silver,
                  bronze: cm.bronze,
                }
              : null;
          })
          .filter(Boolean);
        return { year, data };
      });
    }
    populationData = processPopulationData(olympicData);

    // Create a data subset that contains the bronze, silver, and gold medals won by each
    // country, as well as that country's GDP for a given year
    function processGdpData(olympicData) {
      return years.map((year) => {
        const countryMedals = olympicData.find(
          (c) => c.year == year
        ).countryMedals;
        const data = rawGdpData
          .filter((d) => d.NOC in countryMedals)
          .map((d) => {
            const gdp = d[year];
            const cm = countryMedals[d.NOC];
            return gdp && cm
              ? {
                  NOC: d.NOC,
                  gdp: +gdp,
                  medals: cm.medals,
                  gold: cm.gold,
                  silver: cm.silver,
                  bronze: cm.bronze,
                }
              : null;
          })
          .filter(Boolean);
        return { year, data };
      });
    }
    gdpData = processGdpData(olympicData);

    // Create a data subset that contains the bronze, silver, and gold medals won by each
    // country, as well as that country's hosting status for a given year
    function processHostData(olympicData) {
      const hostData = [];
      olympicData.forEach((d) => {
        let data = [];
        for (const c in d.countryMedals) {
          const cm = d.countryMedals[c];
          const host = cm.NOC === d.host ? "host" : "non-host";
          data.push({
            NOC: cm.NOC,
            host: host,
            medals: cm.medals,
            gold: cm.gold,
            silver: cm.silver,
            bronze: cm.bronze,
          });
        }
        hostData.push({ year: d.year, data: data });
      });
      return hostData;
    }
    hostData = processHostData(olympicData);

    // Visualizations ////////////////////////////////////////////////////////////////////////////
      // Tooltips
    function addTooltip(svg, circles, formatter) {
      const tooltip = d3
        .select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      circles
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(formatter(d))
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () =>
          tooltip.transition().duration(500).style("opacity", 0)
        );
    }

    // Function to create a scatter plot given a dataset
    function makeScatterPlot(data, factor, year, i) {
        // measurements
      const width = 1200;
      const height = 500;
      const margin = { top: 80, right: 150, bottom: 40, left: 100 };

      // Create the svg
      const svg = d3
        .select(`#svg${i}`)
        .insert("svg", ".my-box")
        .attr("viewBox", [0, 0, width, height]);

      // Create the title
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", (margin.left + width - margin.right) / 2)
        .attr("y", margin.top / 2)
        .attr("font-weight", "bold")
        .style("font-size", "25px")
        .text(factor == "host" ? "Hosting Status vs. Medals Won - " + year
            : factor == "gdp" ? "GDP" + " vs. Medals Won - " + year : "Population" + " vs. Medals Won - " + year);

      // Create the x axis label
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", (margin.left + width - margin.right) / 2)
        .attr("y", height - 5)
        .attr("font-weight", "bold")
        .style("font-size", "15px")
        .text(factor == "host" ? "Hosting Status"
            : factor == "gdp" ? "GDP in Millions of USD" : "Population in Thousands");

      // Create the y axis label
      svg
        .append("text")
        .attr("text-anchor", "start")
        .attr("x", margin.left - 20)
        .attr("y", margin.top - 15)
        .attr("font-weight", "bold")
        .style("font-size", "15px")
        .text("Medals Won");

      minVal = d3.min(data, (d) => d[factor]);
      if (d3.min(data, (d) => d[factor]) == 0) {
        minVal += 10;
      }
      // Create the x axis
      const x =
        factor == "host"
          ? d3.scaleBand().domain(data.map((d) => d[factor]))
          : d3.scaleLog().domain([minVal, d3.max(data, (d) => d[factor])]);
      x.range([margin.left, width - margin.right]);
      const xAxis = (g) =>
        g.attr("transform", "translate(0," + (height - margin.bottom) + ")")
          .call(d3.axisBottom(x));
      svg.append("g").call(xAxis);

      // Create the y axis
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.medals)])
        .rangeRound([height - margin.bottom, margin.top]);
      const yAxis = (g) =>
        g.attr("transform", "translate(" + margin.left + ",0)")
          .call(d3.axisLeft(y));
      svg.append("g").call(yAxis);

      // Create the dots
      const circles = svg
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) =>
          factor == "host" ? x(d[factor]) + x.bandwidth() / 2 : x(d[factor])
        )
        .attr("cy", (d) => y(d.medals))
        .attr("r", 5)
        .style("fill", "black");

      // Add tooltips
      addTooltip(
        svg,
        circles,
        (d) =>
          `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${factor}: ${
            factor === "population" ? formatPopulation(d[factor]) : d[factor]
          }<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${
            d.silver || 0
          }<br>Bronze: ${d.bronze || 0}`
      );
    }

    // 1912
    makeScatterPlot(
      populationData.find((c) => c.year == "1912").data,
      "population",
      "1912",
      1
    );
    makeScatterPlot(
      gdpData.find((c) => c.year == "1912").data,
      "gdp",
      "1912",
      2
    );
    makeScatterPlot(
      hostData.find((c) => c.year == "1912").data.sort(function (x, y) {
          return d3.ascending(x.host, y.host);
        }),
      "host",
      "1912",
      3
    );

    // 1964
    makeScatterPlot(
      populationData.find((c) => c.year == "1964").data,
      "population",
      "1964",
      4
    );
    makeScatterPlot(
      hostData
        .find((c) => c.year == "1964")
        .data.sort(function (x, y) {
          return d3.ascending(x.host, y.host);
        }),
      "host",
      "1964",
      5
    );
    makeScatterPlot(
      gdpData.find((c) => c.year == "1964").data,
      "gdp",
      "1964",
      6
    );

    // 2000
    makeScatterPlot(
      populationData.find((c) => c.year == "2000").data,
      "population",
      "2000",
      7
    );
    makeScatterPlot(
      hostData.find((c) => c.year == "2000").data.sort(function (x, y) {
          return d3.ascending(x.host, y.host);
        }),
      "host",
      "2000",
      8
    );
    makeScatterPlot(
      gdpData.find((c) => c.year == "2000").data,
      "gdp",
      "2000",
      9
    );

    // stream graph
    function makeStreamGraph(data, i) {
      //Filtering Data for invalid rows
      const filtered = data.filter((d) => d.Medal && d.Medal !== "NA");
      //totalling medals per country
      const totals = d3
        .rollups(
          filtered,
          (v) => v.length,
          (d) => d.NOC
        )
        .sort((a, b) => d3.descending(a[1], b[1]))
        .map((d) => d[0]);

      const years = Array.from(new Set(filtered.map((d) => +d.Edition))).sort();

      if (filtered.length === 0) {
        drawEmptyStreamGraph(i); // Custom function below
        return;
      }
      

      // Reshaping Data for stream graph
      const streamData = years.map((year) => {
        const row = { year };
        for (const noc of totals) {
          row[noc] = filtered.filter(
            (d) => +d.Edition === year && d.NOC === noc
          ).length;
        }
        return row;
      });

      //Extract top 10
      const keys = Object.keys(streamData[0]).filter((k) => k !== "year");
      const stack = d3.stack().keys(keys).offset(d3.stackOffsetNone);
      const series = stack(streamData);

      //Dimensions
      const width = 1300;
      const height = 500;
      const margin = { top: 75, right: 260, bottom: 50, left: 100 };

      //Create svg
      const svg = d3
        .select(`#svg${i}`)
        .insert("svg", ".after-svg")
        .attr("viewBox", [0, 0, width, height]);

      //X scale (linear)
      const x = d3
        .scaleLinear()
        .domain(d3.extent(streamData, (d) => d.year))
        .range([margin.left, width - margin.right]);

      //Y scale (linear)
      const y = d3
        .scaleLinear()
        .domain([
          d3.min(series, (layer) => d3.min(layer, (d) => d[0])),
          d3.max(series, (layer) => d3.max(layer, (d) => d[1])),
        ])
        .range([height - margin.bottom, margin.top]);

      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
        .attr("y", margin.left - 70)
        .attr("font-weight", "bold")
        .style("font-size", "17px");

      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)
        .attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
        .attr("y", margin.left - 55)
        .attr("font-weight", "bold")
        .style("font-size", "17px")
        .text("Total Medals Per Game");

      //Color Scheme
      const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

      //Generate area for stream graph + smoothing
      const area = d3
        .area()
        .curve(d3.curveBasis)
        .x((d) => x(d.data.year))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]));

      //Draw layers
      svg
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", (d) => color(d.key))
        .attr("d", area)
        .append("title")
        .text((d) => d.key);

      //Create x axis with labels
      svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .attr("font-weight", "bold")
        .style("font-size", "15px");

      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
        .attr("y", margin.top + height - 75)
        .attr("font-weight", "bold")
        .style("font-size", "17px")
        .text("Years");

      //Create y axis with no labels + ticks
      svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call((g) =>
          g
            .selectAll(".tick text")
            .style("font-weight", "bold")
            .style("font-size", "15px")
        )
        .select(".domain")
        .attr("stroke", "black");

      //Title
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", (margin.left + width - margin.right) / 2)
        .attr("y", margin.top / 2)
        .attr("font-weight", "bold")
        .style("font-size", "25px")
        .text("Total Olympic Medals per Countries");

      //Legend
      const legendContainer = svg.append("foreignObject")
        .attr("x", width - margin.right + 10)
        .attr("y", margin.top)
        .attr("width", 230)
        .attr("height", 400);

      const legendDiv = legendContainer.append("xhtml:div")
        .style("overflow-y", "auto")
        .style("max-height", "380px")
        .style("padding-right", "10px");

      legendDiv.append("div")
        .style("font-weight", "bold")
        .style("font-size", "18px")
        .style("margin-bottom", "10px")
        .html("Countries by Medal Count");

      const legendItems = legendDiv.selectAll("div.legend-row")
        .data(keys)
        .enter()
        .append("div")
        .attr("class", "legend-row")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "4px");

      legendItems.append("div")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", d => color(d))
        .style("margin-right", "6px");

      legendItems.append("span")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text(d => nocToCountry[d] || d);

    }


makeStreamGraph(rawOlympicData, 11);      


  }) 
  .catch(function (error) {
    console.error("Error:", error);
  });
