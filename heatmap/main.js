const csvs = [
  "../data/ALL_MEDALISTS_modified@3.csv",
  "../data/GDP_Data_Year_1_To_2008_modified@2.csv",
  "../data/Population_Data_Year_1_To_2008_modified@2.csv",
  "../data/NOC_CODES_modified.csv",
];

Promise.all(csvs.map((file) => d3.csv(file))).then(function (dataArray) {
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
      let countryMedals = olympicData.find((c) => c.year == year).countryMedals;

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
      let countryMedals = olympicData.find((c) => c.year == year).countryMedals;

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

  function heatmap() {
    const userYear = "2000";

    const host = olympicData.find((d) => d.year === userYear).host;

    const popData = populationData.find((d) => d.year === userYear).data;
    const gdpValue = gdpData.find((d) => d.year === userYear).data;

    // reshape data for pearson calculations
    const heatmapData = popData.flatMap((p) => {
      const a = gdpValue.find((d) => d.NOC === p.NOC);

      if (a == null) {
        return [];
      }

      const Population = Number(p.population);
      const GDP = Number(a.gdp);
      const Medals = Number(a.medals);

      return {
        NOC: p.NOC,
        Medals,
        Population,
        GDP,
        Host: p.NOC === host ? 1 : 0,
      };
    });

    const variables = ["Medals", "GDP", "Population", "Host"];
    const pCoeff = [];
    const pearsonData = [];

    // calculating pearson value
    for (let i = 0; i < variables.length; i++) {
      for (let j = 0; j < variables.length; j++) {
        const varX = heatmapData.map((row) => row[variables[i]]);
        const varY = heatmapData.map((row) => row[variables[j]]);
        const pValue = ss.sampleCorrelation(varX, varY);
        pCoeff.push(pValue);

        pearsonData.push({
          variable: variables[i],
          group: variables[j],
          value: pValue,
        });
      }
    }

    // Graph Dimensions
    const margin = { top: 80, right: 80, bottom: 80, left: 80 },
      width = 500 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    const svg = d3
      .select("#heatmap")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(variables).padding(0.04);
    const y = d3.scaleBand().range([height, 0]).domain(variables).padding(0.04);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .attr("font-size", "12px")
      .style("font-weight", "bold");

    svg
      .append("g")
      .call(d3.axisLeft(y))
      .attr("font-size", "12px")
      .style("font-weight", "bold");

    // Map color scheme
    const scheme = d3
      .scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain([-0.65, 1.7]); // feel free to change the color shades

    // Block Color
    svg
      .selectAll()
      .data(pearsonData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.group))
      .attr("y", (d) => y(d.variable))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", (d) => scheme(d.value))
      .style("stroke", "black")
      .style("stroke-width", 1);

    // Block Value Labels
    svg
      .selectAll()
      .data(pearsonData)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.group) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.variable) + y.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "11px")
      .text((d) => d.value.toFixed(2));
  }
  const result = heatmap();
});
