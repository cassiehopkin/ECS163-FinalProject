Promise.all(csvs.map(file => d3.csv(file)))
  .then(function(dataArray) {
    // Global Assets /////////////////////////////////////////////////////////////////////////////////

      // Scatter plot measurements
      const scatterMargin = ({top: 100, right: 50, bottom: 50, left: 50});
      const scatterHeight = 450;
      const scatterWidth = 800;

    // Parse Data //////////////////////////////////////////////////////////////////////////////////////
    const rawOlympicData = dataArray[0]
    const rawGdpData = dataArray[1]
    const rawPopulationData = dataArray[2]
    const rawNocData = dataArray[3]

    // Process Data ///////////////////////////////////////////////////////////////////////////////////
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

    olympicData = processOlympicData();

    // Array of all years
    let years = []
    olympicData.forEach(d =>{
        years.push(d.year);
    })

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
            bronze: cm.bronze
          } : null;
        }).filter(Boolean);
        return { year: year, data: data };
      });
    }
    populationData = processPopulationData(olympicData);

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
              bronze: cm.bronze
            } : null;
          }).filter(Boolean);
          return { year: year, data: data };
        });
      }

    gdpData = processGdpData(olympicData);

      function processHostData(olympicData) {
          const hostData = [];
          olympicData.forEach(d => {
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
          })
          return hostData;
      }
      hostData = processHostData(olympicData);

    // Visualizations ////////////////////////////////////////////////////////////////////////////

    // fill dropdown with all years
      const dropDownList = document.getElementById("years");
      years.forEach(year => {
          const newOption = document.createElement("option");
          newOption.text = year;
          newOption.value = year;
          dropDownList.appendChild(newOption);
      })
      let userYear = dropDownList.value;

      // Scatter Plots ////////////////////////////////////////////////////////////////////////////

      // Set Data
      let scatterPopulationData = populationData.find( c => c.year == userYear ).data;
      let scatterGdpData = gdpData.find( c => c.year == userYear ).data;
      let scatterHostData = hostData.find( c => c.year == userYear ).data.sort(function(x, y){return d3.ascending(x.host, y.host);});

      // Svgs
      const populationSvg = d3.select("#populationScatter").append("svg").attr("viewBox", [0, 0, scatterWidth, scatterHeight]);
      const gdpSvg = d3.select("#gdpScatter").append("svg").attr("viewBox", [0, 0, scatterWidth, scatterHeight]);
      const hostSvg = d3.select("#hostScatter").append("svg").attr("viewBox", [0, 0, scatterWidth, scatterHeight]);

      // Titles
      populationSvg.append("text").attr("text-anchor", "middle").attr("x", (scatterMargin.left + scatterWidth - scatterMargin.right) / 2).attr("y", scatterMargin.top / 2).attr("font-weight", "bold").style("font-size", "25px")
          .text("Population vs. Medals Won");
      gdpSvg.append("text").attr("text-anchor", "middle").attr("x", (scatterMargin.left + scatterWidth - scatterMargin.right) / 2).attr("y", scatterMargin.top / 2).attr("font-weight", "bold").style("font-size", "25px")
          .text("GDP vs. Medals Won");
      hostSvg.append("text").attr("text-anchor", "middle").attr("x", (scatterMargin.left + scatterWidth - scatterMargin.right) / 2).attr("y", scatterMargin.top / 2).attr("font-weight", "bold").style("font-size", "25px")
          .text("Hosting or Not vs. Medals Won");

      // x axis Labels
      populationSvg.append("text").attr("text-anchor", "middle").attr("x", (scatterMargin.left + scatterWidth - scatterMargin.right) / 2).attr("y", scatterHeight - 5).attr("font-weight", "bold").style("font-size", "15px")
          .text("Population in Thousands");
      gdpSvg.append("text").attr("text-anchor", "middle").attr("x", (scatterMargin.left + scatterWidth - scatterMargin.right) / 2).attr("y", scatterHeight - 5).attr("font-weight", "bold").style("font-size", "15px")
          .text("GDP in Millions of USD");
      hostSvg.append("text").attr("text-anchor", "middle").attr("x", (scatterMargin.left + scatterWidth - scatterMargin.right) / 2).attr("y", scatterHeight - 5).attr("font-weight", "bold").style("font-size", "15px")
          .text("Hosting or Not");

      // y axis labels
      populationSvg.append("text").attr("text-anchor", "start").attr("x", scatterMargin.left - 20).attr("y", scatterMargin.top - 15).attr("font-weight", "bold").style("font-size", "15px").text("Medals Won");
      gdpSvg.append("text").attr("text-anchor", "start").attr("x", scatterMargin.left - 20).attr("y", scatterMargin.top - 15).attr("font-weight", "bold").style("font-size", "15px").text("Medals Won");
      hostSvg.append("text").attr("text-anchor", "start").attr("x", scatterMargin.left - 20).attr("y", scatterMargin.top - 15).attr("font-weight", "bold").style("font-size", "15px").text("Medals Won");

      // x axes
      const populationX = d3.scaleLog().domain([d3.min(scatterPopulationData, d => d.population), d3.max(scatterPopulationData, d => d.population)]).range([scatterMargin.left, scatterWidth - scatterMargin.right]);
      const gdpX = d3.scaleLog().domain([d3.min(scatterGdpData, d => d.gdp), d3.max(scatterGdpData, d => d.gdp)]).range([scatterMargin.left, scatterWidth - scatterMargin.right]);
      const hostX = d3.scaleBand().domain(scatterHostData.map(d => d.host)).range([scatterMargin.left, scatterWidth - scatterMargin.right]);

      const populationXAxis = g => g.attr("transform", "translate(0," + (scatterHeight - scatterMargin.bottom) + ")").call(d3.axisBottom(populationX));
      const gdpXAxis = g => g.attr("transform", "translate(0," + (scatterHeight - scatterMargin.bottom) + ")").call(d3.axisBottom(gdpX));
      const hostXAxis = g => g.attr("transform", "translate(0," + (scatterHeight - scatterMargin.bottom) + ")").call(d3.axisBottom(hostX));

      let populationGx = populationSvg.append("g");
      let gdpGx = gdpSvg.append("g");
      let hostGx = hostSvg.append("g");

      populationGx.call(populationXAxis);
      gdpGx.call(gdpXAxis);
      hostGx.call(hostXAxis);

      // y axes
      const populationY = d3.scaleLinear().domain([0, d3.max(scatterPopulationData, d => d.medals)]).rangeRound([scatterHeight - scatterMargin.bottom, scatterMargin.top]);
      const gdpY = d3.scaleLinear().domain([0, d3.max(scatterGdpData, d => d.medals)]).rangeRound([scatterHeight - scatterMargin.bottom, scatterMargin.top]);
      const hostY = d3.scaleLinear().domain([0, d3.max(scatterHostData, d => d.medals)]).rangeRound([scatterHeight - scatterMargin.bottom, scatterMargin.top]);

      const populationYAxis = g => g.attr("transform", "translate(" + (scatterMargin.left) + ",0)").call(d3.axisLeft(populationY));
      const gdpYAxis = g => g.attr("transform", "translate(" + (scatterMargin.left) + ",0)").call(d3.axisLeft(gdpY));
      const hostYAxis = g => g.attr("transform", "translate(" + (scatterMargin.left) + ",0)").call(d3.axisLeft(hostY));

      let populationGy = populationSvg.append("g");
      let gdpGy = gdpSvg.append("g");
      let hostGy = hostSvg.append("g");

      populationGy.call(populationYAxis);
      gdpGy.call(gdpYAxis);
      hostGy.call(hostYAxis);

      // dots
      // https://observablehq.com/@d3/selection-join
      function renderDots(){
          const populationT = populationSvg.transition().delay(50).duration(750);
          const gdpT = gdpSvg.transition().delay(50).duration(750);
          const hostT = hostSvg.transition().delay(50).duration(750);

          populationSvg.selectAll("circle").data(scatterPopulationData).join(
              enter => enter.append("circle").attr("r", 5).style("fill", "black").attr("cy", d => populationY(d.medals)).attr("cx", d => populationX(d.population))
                                     .attr("opacity", 0).call(enter => enter.transition(populationT).attr("opacity", 1)),
              update => update.call(update => update.transition(populationT).attr("cy", d => populationY(d.medals)).attr("cx", d => populationX(d.population))),
              exit => exit.call(exit => exit.transition(populationT).attr("opacity", 0)).remove()
          )

          gdpSvg.selectAll("circle").data(scatterGdpData).join(
              enter => enter.append("circle").attr("r", 5).style("fill", "black").attr("cy", d => gdpY(d.medals)).attr("cx", d => gdpX(d.gdp))
                                     .attr("opacity", 0).call(enter => enter.transition(gdpT).attr("opacity", 1)),
              update => update.call(update => update.transition(gdpT).attr("cy", d => gdpY(d.medals)).attr("cx", d => gdpX(d.gdp))),
              exit => exit.call(exit => exit.transition(gdpT)).attr("opacity", 0).remove()
          )

          hostSvg.selectAll("circle").data(scatterHostData).join(
              enter => enter.append("circle").attr("r", 5).style("fill", "black").attr("cy", d => hostY(d.medals)).attr("cx", d => hostX(d.host) + hostX.bandwidth()/2)
                                     .attr("opacity", 0).call(enter => enter.transition(hostT).attr("opacity", 1)),
              update => update.call(update => update.transition(hostT).attr("cy", d => hostY(d.medals)).attr("cx", d => hostX(d.host) + hostX.bandwidth()/2)),
              exit => exit.call(exit => exit.transition(hostT).attr("opacity", 0)).remove()
          )
      }
      renderDots();

      // Tooltips ////////////////////////////////////////////////////////////////////////////
      const tooltip = d3.select("body").append("div")
          .style("position", "absolute")
          .style("background", "#fff")
          .style("border", "1px solid #ccc")
          .style("padding", "5px")
          .style("pointer-events", "none")
          .style("opacity", 0);
      function addTooltip(svg, formatter)
      {
          svg.selectAll("circle").on("mouseover", function(event, d) {
              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html(formatter(d))
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px");
          })
              .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
      }
      addTooltip(populationSvg, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${"population"}: ${formatPopulation(d.population)}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);
      addTooltip(gdpSvg, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${"gdp"}: ${d.gdp}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);
      addTooltip(hostSvg, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${"host"}: ${d.host}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);

      // Heatmap ////////////////////////////////////////////////////////////////////////////
      const variables = ["Medals", "GDP", "Population", "Host"];

      function generatePearsonData(){
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

          return pearsonData;
      }

      let pearsonData = generatePearsonData();

      // Graph Dimensions
      const margin = { top: 80, right: 80, bottom: 80, left: 80 },
          width = 500 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

      const svg = d3
          .select("#heatmap")
          .append("svg")
          .attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
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

      // Title
      svg.append("text")
          .attr("text-anchor", "middle")
          .attr("x", (margin.left + width - margin.right) / 2)
          .attr("y", margin.top / 2 - 75)
          .attr("font-weight", "bold")
          .style("font-size", "25px")
          .text("Pearson Correlation");

      // Map color scheme
      const scheme = d3
          .scaleSequential()
          .interpolator(d3.interpolateBlues)
          .domain([-0.65, 1.7]); // feel free to change the color shades

      function renderBlocks(){
          //Transition
          const t = svg.transition().delay(50).duration(750);

          // Block Color
          svg
              .selectAll()
              .data(pearsonData)
              .join(
                  enter => enter.append("rect")
                      .attr("x", (d) => x(d.group))
                      .attr("y", (d) => y(d.variable))
                      .attr("width", x.bandwidth())
                      .attr("height", y.bandwidth())
                      .style("fill", (d) => scheme(d.value))
                      .style("stroke", "black")
                      .style("stroke-width", 1)
                      .attr("opacity", 0).call(enter => enter.transition(t).attr("opacity", 1)),
                  update => update.call(update => update.transition(t).style("fill", (d) => scheme(d.value))),
                  exit => exit.call(enter => enter.transition(t).attr("opacity", 0)).remove()
              )

          // Block Value Labels
          svg
              .selectAll()
              .data(pearsonData)
              .join(
                  enter => enter.append("text")
                      .attr("x", (d) => x(d.group) + x.bandwidth() / 2)
                      .attr("y", (d) => y(d.variable) + y.bandwidth() / 2)
                      .attr("text-anchor", "middle")
                      .attr("dominant-baseline", "middle")
                      .attr("font-weight", "bold")
                      .attr("font-size", "11px")
                      .text((d) => d.value.toFixed(2))
                      .attr("opacity", 0).call(enter => enter.transition(t).attr("opacity", 1)),
                  update => update.text((d) => d.value.toFixed(2)),
                  exit => exit.call(enter => enter.transition(t).attr("opacity", 0)).remove()
              )

      }
      renderBlocks();

      // Dropdown Menu ////////////////////////////////////////////////////////////////////////////
      const dropdown = d3.select("#years");
      dropdown.on("change", function()
      {
          userYear = dropDownList.value;

          // Update scatter plots
          scatterPopulationData = populationData.find( c => c.year == userYear ).data;
          scatterGdpData = gdpData.find( c => c.year == userYear ).data;
          scatterHostData = hostData.find( c => c.year == userYear ).data.sort(function(x, y){return d3.ascending(x.host, y.host);});

          populationX.domain([d3.min(scatterPopulationData, d => d.population), d3.max(scatterPopulationData, d => d.population)]);
          gdpX.domain([d3.min(scatterGdpData, d => d.gdp), d3.max(scatterGdpData, d => d.gdp)]);

          populationY.domain([0, d3.max(scatterPopulationData, d => d.medals)]);
          gdpY.domain([0, d3.max(scatterGdpData, d => d.medals)]);
          hostY.domain([0, d3.max(scatterHostData, d => d.medals)]);

          populationGx.transition().delay(50).duration(750).call(populationXAxis);
          gdpGx.transition().delay(50).duration(750).call(gdpXAxis);

          populationGy.transition().delay(50).duration(750).call(populationYAxis);
          gdpGy.transition().delay(50).duration(750).call(gdpYAxis);
          hostGy.transition().delay(50).duration(750).call(hostYAxis);

          renderDots();
          addTooltip(populationSvg, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${"population"}: ${formatPopulation(d.population)}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);
          addTooltip(gdpSvg, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${"gdp"}: ${d.gdp}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);
          addTooltip(hostSvg, d => `Country: ${nocMap.get(d.NOC) || d.NOC}<br>${"host"}: ${d.host}<br>Total Medals: ${d.medals}<br>Gold: ${d.gold || 0}<br>Silver: ${d.silver || 0}<br>Bronze: ${d.bronze || 0}`);

          // Update heatmap
          pearsonData = generatePearsonData();
          renderBlocks();
      })

  })
  .catch(function(error) {
    console.error("Error:", error);
  });
