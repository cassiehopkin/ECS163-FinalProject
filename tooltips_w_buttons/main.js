async function main() {
  const years = ["1920", "1960", "2000"];
  const colors = [
    { id: "normal", color: "#000000" },
    { id: "host", color: "#4287f5" },
    { id: "non-host", color: "#DEDEDE" },
    { id: "average", color: "#000000" }
  ];

  function color(id) {
    return colors.find(d => d.id === id).color;
  }

  const placementHierarchy = [
    { id: "host", placement: 2 },
    { id: "non-host", placement: 0 },
    { id: "average", placement: 1 }
  ];

  function placement(id) {
    return placementHierarchy.find(d => d.id === id).placement;
  }

  const rawOlympicData = await d3.csv("../data/ALL_MEDALISTS_modified@3.csv", d3.autoType);
  const rawGdpData = await d3.csv("../data/GDP_Data_Year_1_To_2008_modified@2.csv", d3.autoType);
  const rawPopulationData = await d3.csv("../data/Population_Data_Year_1_To_2008_modified@2.csv", d3.autoType);
  const rawNocData = await d3.csv("../data/NOC_CODES_modified.csv", d3.autoType);

  const nocMap = new Map(rawNocData.map(d => [d.NOC, d.Country]));

  function formatPopulation(value) {
    return (value / 1000).toFixed(2) + " million";
  }

  function processOlympicData() {
    let formattedData = [];
    const allYears = {};

    rawOlympicData.forEach(d => {
      if (!(d.Edition in allYears)) {
        allYears[d.Edition] = {
          year: d.Edition,
          host: d.HostNOC,
          countryMedals: {}
        };
      }

      const country = allYears[d.Edition].countryMedals[d.NOC];
      if (country) {
        country.medals++;
        country.gold += d.Medal === "Gold" ? 1 : 0;
        country.silver += d.Medal === "Silver" ? 1 : 0;
        country.bronze += d.Medal === "Bronze" ? 1 : 0;
      } else if (rawNocData.some(c => c.NOC === d.NOC)) {
        allYears[d.Edition].countryMedals[d.NOC] = {
          NOC: d.NOC,
          medals: 1,
          gold: d.Medal === "Gold" ? 1 : 0,
          silver: d.Medal === "Silver" ? 1 : 0,
          bronze: d.Medal === "Bronze" ? 1 : 0
        };
      }
    });

    for (const year in allYears) {
      formattedData.push(allYears[year]);
    }

    return formattedData;
  }

  function processPopulationData(olympicData) {
    return years.map(year => {
      const countryMedals = olympicData.find(c => c.year == year).countryMedals;
      const data = rawPopulationData.filter(d => d.NOC in countryMedals).map(d => {
        const pop = d[year];
        const cm = countryMedals[d.NOC];
        return pop && cm ? {
          NOC: d.NOC,
          population: +pop, 
          medals: cm.medals,
          gold: cm.gold,
          silver: cm.silver,
          bronze: cm.bronze,
          id: "normal"
        } : null;
      }).filter(Boolean);
      return { year, data };
    });
  }

  function processGdpData(olympicData) {
    return years.map(year => {
      const countryMedals = olympicData.find(c => c.year == year).countryMedals;
      const data = rawGdpData.filter(d => d.NOC in countryMedals).map(d => {
        const gdp = d[year];
        const cm = countryMedals[d.NOC];
        return gdp && cm ? {
          NOC: d.NOC,
          gdp: +gdp,
          medals: cm.medals,
          gold: cm.gold,
          silver: cm.silver,
          bronze: cm.bronze,
          id: "normal"
        } : null;
      }).filter(Boolean);
      return { year, data };
    });
  }

  function processHostData(olympicData) {
    const hostData = [];
    olympicData.forEach(d => {
      let medal_sum = 0;
      for (const c in d.countryMedals) {
        const cm = d.countryMedals[c];
        const id = cm.NOC === d.host ? "host" : "non-host";
        if (id === "non-host") medal_sum += cm.medals;
        hostData.push({
          NOC: cm.NOC,
          year: d.year,
          medals: cm.medals,
          gold: cm.gold,
          silver: cm.silver,
          bronze: cm.bronze,
          id
        });
      }
      hostData.push({
        NOC: "average",
        year: d.year,
        medals: medal_sum / (Object.keys(d.countryMedals).length - 1),
        gold: null,
        silver: null,
        bronze: null,
        id: "average"
      });
    });
    return hostData;
  }

  function addTooltip(svg, circles, formatter) {
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    circles.on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(formatter(d))
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
  }

  function makeScatterPlot(data, factor, year) {
    const margin = { top: 100, right: 200, bottom: 60, left: 40 }, width = 1300, height = 450;
    const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);

    const x = d3.scaleLog().domain(d3.extent(data, d => d[factor])).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.medals)]).range([height - margin.bottom, margin.top]);

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    const circles = svg.selectAll("circle").data(data).enter().append("circle")
      .attr("cx", d => x(d[factor]) + 18)
      .attr("cy", d => y(d.medals))
      .attr("r", 5)
      .style("fill", d => color(d.id));

    addTooltip(svg, circles, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${factor}: ${factor === 'population' ? formatPopulation(d[factor]) : d[factor]}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);

    svg.append("text").attr("x", (margin.left + width - margin.right) / 2).attr("y", margin.top / 2)
      .attr("text-anchor", "middle").attr("font-weight", "bold").style("font-size", "25px")
      .text(`${factor} vs. medals won - ${year}`);

    svg.append("text").attr("x", (margin.left + width - margin.right) / 2).attr("y", height - 5)
      .attr("text-anchor", "middle").attr("font-weight", "bold").style("font-size", "15px")
      .text(factor === 'population' ? 'population (millions)' : factor);

    svg.append("text").attr("x", margin.left - 20).attr("y", margin.top - 15)
      .attr("text-anchor", "start").attr("font-weight", "bold").style("font-size", "15px")
      .text("medals won");

    return svg.node();
  }

  function makeHostPlot(data) {
    const margin = { top: 100, right: 200, bottom: 40, left: 40 }, width = 1300, height = 450;
    data.sort((x, y) => d3.ascending(placement(x.id), placement(y.id)));
    const lineData = data.filter(d => d.id === "host" || d.id === "average");
    const groupedLineData = d3.group(lineData, d => d.id);
    const x = d3.scaleBand().domain(data.map(d => d.year)).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.medals)]).range([height - margin.bottom, margin.top]);

    const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    const circles = svg.selectAll("circle").data(data).enter().append("circle")
      .attr("cx", d => x(d.year) + 18).attr("cy", d => y(d.medals)).attr("r", 5)
      .style("fill", d => color(d.id));

    addTooltip(svg, circles, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>Year: ${d.year}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);

    svg.selectAll("path").data(groupedLineData).enter().append("path")
      .attr("fill", "none").attr("stroke", d => color(d[0])).attr("stroke-width", 1.5)
      .attr("d", d => d3.line().x(d => x(d.year) + 18).y(d => y(+d.medals))(d[1]));

    return svg.node();
  }

  const olympicData = processOlympicData();
  const populationData = processPopulationData(olympicData);
  const gdpData = processGdpData(olympicData);
  const hostData = processHostData(olympicData);

  const plotsDiv = d3.select("#plots");

  // --- Host Chart ---
  plotsDiv.append("h2").text("Host Country Performance");
  plotsDiv.node().appendChild(makeHostPlot(hostData));

  // --- GDP Chart ---
  plotsDiv.append("h2").text("GDP vs. Medals");
  const gdpButtons = plotsDiv.append("div");
  const gdpContainer = plotsDiv.append("div").attr("id", "gdp-container");

  years.forEach(year => {
    gdpButtons.append("button")
      .text(year)
      .on("click", () => {
        gdpContainer.selectAll("*").remove();
        gdpContainer.node().appendChild(makeScatterPlot(gdpData.find(d => d.year === year).data, "gdp", year));
      });
  });
  gdpContainer.node().appendChild(makeScatterPlot(gdpData.find(d => d.year === "1920").data, "gdp", "1920"));

  // --- Population Chart ---
  plotsDiv.append("h2").text("Population vs. Medals");
  const popButtons = plotsDiv.append("div");
  const popContainer = plotsDiv.append("div").attr("id", "pop-container");

  years.forEach(year => {
    popButtons.append("button")
      .text(year)
      .on("click", () => {
        popContainer.selectAll("*").remove();
        popContainer.node().appendChild(makeScatterPlot(populationData.find(d => d.year === year).data, "population", year));
      });
  });
  popContainer.node().appendChild(makeScatterPlot(populationData.find(d => d.year === "1920").data, "population", "1920"));

  }

main();