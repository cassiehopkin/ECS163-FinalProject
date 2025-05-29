const csvs = [
  "ALL_MEDALISTS_modified@3.csv",
  "GDP_Data_Year_1_To_2008_modified@2.csv",
  "Population_Data_Year_1_To_2008_modified@2.csv",
  "NOC_CODES_modified.csv",
];

Promise.all(csvs.map((file) => d3.csv(file)))
  .then(function (dataArray) {
    // Global Assets /////////////////////////////////////////////////////////////////////////////////

    // The years we wish to make visualizations for
    const years = ["1920", "1960", "2000"];

    // Colors of the points in the scatter plots
    const colors = [
      { id: "normal", color: "#000000" },
      { id: "host", color: "#4287f5" },
      { id: "non-host", color: "#DEDEDE" },
      { id: "average", color: "#000000" },
    ];

    function color(id) {
      return colors.find((d) => d.id == id).color;
    }

    // Order of the dot types in the host scatter plot
    const placementHierarchy = [
      { id: "host", placement: 2 },
      { id: "non-host", placement: 0 },
      { id: "average", placement: 1 },
    ];

    function placement(id) {
      return placementHierarchy.find((d) => d.id == id).placement;
    }

    // Parse Data //////////////////////////////////////////////////////////////////////////////////////
    const rawOlympicData = dataArray[0];
    const rawGdpData = dataArray[1];
    const rawPopulationData = dataArray[2];
    const rawNocData = dataArray[3];

    // Process Data ///////////////////////////////////////////////////////////////////////////////////
    function processOlympicData() {
      let formattedData = [];
      const allYears = {};

      rawOlympicData.forEach((d) => {
        if (!(d["Edition"] in allYears)) {
          const newYear = {
            year: d["Edition"],
            host: d["HostNOC"],
            countryMedals: {},
          };
          allYears[d["Edition"]] = newYear;
        }
        if (d["NOC"] in allYears[d["Edition"]].countryMedals) {
          allYears[d["Edition"]].countryMedals[d["NOC"]].medals =
            allYears[d["Edition"]].countryMedals[d["NOC"]].medals + 1;
        } else if (
          Object.values(d) != null &&
          rawNocData.some((c) => c["NOC"] == d["NOC"])
        ) {
          const newCountryMedal = {
            NOC: d["NOC"],
            medals: 1,
          };
          allYears[d["Edition"]].countryMedals[d["NOC"]] = newCountryMedal;
        }
      });

      Object.keys(allYears).forEach((d) => {
        formattedData.push(allYears[d]);
      });

      return formattedData;
    }

    const olympicData = processOlympicData();

    function processPopulationData() {
      let populationData = [];

      years.forEach((year) => {
        let data = [];
        let countryMedals = olympicData.find(
          (c) => c.year == year
        ).countryMedals;

        rawPopulationData.forEach((d) => {
          if (d.NOC in countryMedals) {
            let population = d[year];
            let medals = countryMedals[d.NOC].medals;

            if (population && medals) {
              const dataPoint = {
                NOC: d.NOC,
                population: Number(population),
                medals: medals,
                id: "normal",
              };
              data.push(dataPoint);
            }
          }
        });

        const dataPoint = {
          year: year,
          data: data,
        };
        populationData.push(dataPoint);
      });

      return populationData;
    }
    const populationData = processPopulationData();

    function processGdpData() {
      let gdpData = [];

      years.forEach((year) => {
        let data = [];
        let countryMedals = olympicData.find(
          (c) => c.year == year
        ).countryMedals;

        rawGdpData.forEach((d) => {
          if (d.NOC in countryMedals) {
            let gdp = d[year];
            let medals = countryMedals[d.NOC].medals;

            if (gdp && medals) {
              const dataPoint = {
                NOC: d.NOC,
                gdp: Number(gdp),
                medals: medals,
                id: "normal",
              };
              data.push(dataPoint);
            }
          }
        });

        const dataPoint = {
          year: year,
          data: data,
        };
        gdpData.push(dataPoint);
      });

      return gdpData;
    }

    const gdpData = processGdpData();

    function processHostData(year) {
      let hostData = [];

      olympicData.forEach((d) => {
        let medal_sum = 0;

        Object.keys(d.countryMedals).forEach((c) => {
          let id = d.countryMedals[c].NOC == d.host ? "host" : "non-host";
          medal_sum =
            d.countryMedals[c].NOC == d.host
              ? medal_sum
              : medal_sum + d.countryMedals[c].medals;

          const dataPoint = {
            NOC: d.countryMedals[c].NOC,
            year: d.year,
            medals: d.countryMedals[c].medals,
            id: id,
          };
          hostData.push(dataPoint);
        });
        const dataPoint = {
          NOC: "average",
          year: d.year,
          medals: medal_sum / (Object.keys(d.countryMedals).length - 1),
          id: "average",
        };
        hostData.push(dataPoint);
      });
      return hostData;
    }
    const hostData = processHostData();

    // Visualizations ////////////////////////////////////////////////////////////////////////////


    // Stream Graph /////////////////////////////////////////////////////////////////////////////
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
        .slice(0, 10)
        .map((d) => d[0]);

      const years = Array.from(new Set(filtered.map((d) => +d.Edition))).sort();

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
      const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle);
      const series = stack(streamData);

      //Dimensions
      const width = 1200;
      const contextHeight = 130;
      const contextMarginTop = 35;
      const focusHeight = 250;
      const margin = { top: 50, right: 200, bottom: 40, left: 60 };
      const height = focusHeight + contextHeight + margin.top + margin.bottom;

      //Create svg
      const svg = d3
        .select(`#svg${i}`)
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("display", "block");

      //X scale (linear) Focus View
      const x = d3
        .scaleLinear()
        .domain(d3.extent(streamData, (d) => d.year))
        .range([margin.left, width - margin.right]);

      // x scale Context View
      const xContext = d3
        .scaleLinear()
        .domain(d3.extent(streamData, (d) => d.year))
        .range([margin.left, width - margin.right]);

      //Y scale (linear) Focus View
      const y = d3
        .scaleLinear()
        .domain([
          d3.min(series, (layer) => d3.min(layer, (d) => d[0])),
          d3.max(series, (layer) => d3.max(layer, (d) => d[1])),
        ])
        .range([margin.top + focusHeight, margin.top]);

      // Y Scale Context View
      const yContext = d3
        .scaleLinear()
        .domain([
          d3.min(series, (layer) => d3.min(layer, (d) => d[0])),
          d3.max(series, (layer) => d3.max(layer, (d) => d[1])),
        ])
        .range([
          margin.top + focusHeight + contextHeight,
          margin.top + focusHeight + contextMarginTop,
        ]);

      //Color Scheme
      const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

      //Generate area for focus view + smoothing
      const area = d3
        .area()
        .curve(d3.curveBasis)
        .x((d) => x(d.data.year))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]));

      // Formatting Focus View Scroll Behavior (prevents rendering beyond x-axis bounds)
      svg
        .append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom);

      //Generate area for context view + smoothing
      const areaContext = d3
        .area()
        .curve(d3.curveBasis)
        .x((d) => xContext(d.data.year))
        .y0((d) => yContext(d[0]))
        .y1((d) => yContext(d[1]));

      //Draw Focus layers
      svg
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", (d) => color(d.key))
        .attr("d", area)
        .attr("class", "area focus")
        .attr("clip-path", "url(#clip)")
        .append("title")
        .text((d) => d.key);

      //Create x axis with labels
      const xFocusAxis = svg
        .append("g")
        .attr("transform", `translate(0,${margin.top + focusHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .attr("font-weight", "bold")
        .style("font-size", "15px");

      //Create y axis with no labels + ticks
      svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat("").tickSize(0))
        .select(".domain")
        .attr("stroke", "black");

      // Draw Context Layers
      svg
        .append("g")
        .attr("class", "context")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", (d) => color(d.key))
        .attr("d", areaContext);

      // X-axis Context
      svg
        .append("g")
        .attr(
          "transform",
          `translate(0,${margin.top + focusHeight + contextHeight})`
        )
        .call(d3.axisBottom(xContext).tickFormat(d3.format("d")))
        .attr("font-weight", "bold")
        .attr("font-size", "14px");

      // set default position and size of brush window in the context field
      const defaultView = [x(x.domain()[0]), x(x.domain()[0] + 20)];

      // define brush dimension boundaries
      const brush = d3
        .brushX()
        .extent([
          [margin.left, margin.top + focusHeight + contextMarginTop],
          [width - margin.right, margin.top + focusHeight + contextHeight - 1],
        ])
        .on("brush", brushed)
        .on("end", brushended);

      const gb = svg.append("g").call(brush).call(brush.move, defaultView);

      // define brush behavior
      function brushed({ selection }) {
        if (selection) {
          const [x0, x1] = selection.map(xContext.invert);
          x.domain([x0, x1]);

          svg.selectAll(".area.focus").attr("d", area);
          xFocusAxis.call(d3.axisBottom(x).tickFormat(d3.format("d")));
        }
      }

      function brushended({ selection }) {
        if (!selection) {
          gb.call(brush.move, defaultView);
        }
      }

      //Title
      svg
        .append("text")
        .attr("x", width / 6)
        .attr("y", margin.top - 10)
        .attr("font-weight", "bold")
        .style("font-size", "25px")
        .text("Olympic Medals by Country (Top 10 Stream Graph)");

      //Legend
      const legend = svg
        .append("g")
        .attr(
          "transform",
          `translate(${width - margin.right + 10}, ${margin.top})`
        );

      keys.forEach((key, i) => {
        const row = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 20})`);

        row
          .append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(key));

        row
          .append("text")
          .attr("x", 16)
          .attr("y", 10)
          .text(key)
          .attr("alignment-baseline", "middle")
          .attr("font-size", "12px");
      });
    }
    const streamgraph = makeStreamGraph(rawOlympicData, 8);
  })
  .catch(function (error) {
    console.error("Error:", error);
  });
