Promise.all(csvs.map((file) => d3.csv(file)))
  .then(function (dataArray) {
    // Global Assets /////////////////////////////////////////////////////////////////////////////////
    const rawNocData = dataArray[3];
    const nocToCountry = {};
    rawNocData.forEach((d) => {
      nocToCountry[d.NOC] = d.Country;
    });


    // Parse Data //////////////////////////////////////////////////////////////////////////////////////
    const rawOlympicData = dataArray[0];
    const rawConflictData = dataArray[4];

    // Process Data ///////////////////////////////////////////////////////////////////////////////////
    function processConflictData() {
      const importantConflicts = [
        "World War II",
        "World War I",
        "Cold War",
        "Soviet-Afghan War",
        "Yugoslav Wars",
      ];

      const filteredData = rawConflictData.filter((d) =>
        importantConflicts.includes(d.eventLabel)
      );

      let formattedData = filteredData.map((d) => ({
        event: d.eventLabel,
        start: new Date(d.startDate).getFullYear(),
        end: new Date(d.endDate).getFullYear(),
      }));
      return formattedData;
    }

    const conflictData = processConflictData();


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

      //const years = Array.from(new Set(filtered.map((d) => +d.Edition))).sort();
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
      const whiteSpaceTop = 100;
      const margin = { top: 50, right: 200, bottom: 10, left: 60 };
      const height =
        focusHeight +
        contextHeight +
        margin.top +
        margin.bottom +
        whiteSpaceTop;

      //Create svg
      const svg = d3
        .select(`#svg${i}`)
        .insert("svg", ".my-box")
        .attr("viewBox", [0, 0, width, height])
        .style("display", "block");

      const conflictSquare = svg
        .append("g")
        .attr("class", "conflict-squares")
        .attr("clip-path", "url(#clip)");

      function drawConflictOutline(xScale) {
        const squares = conflictSquare
          .selectAll("rect")
          .data(conflictData, (d) => d.event);

        squares
          .join("rect")
          .attr("x", (d) => xScale(d.start))
          .attr("y", margin.top)
          .attr("width", (d) => xScale(d.end) - xScale(d.start))
          .attr("height", height - whiteSpaceTop - margin.bottom - focusHeight)
          .attr("fill", "red")
          .attr("opacity", 0.1)
          .on("mouseover", function (event, d) {
            tooltip
              .html(`<strong>${d.event}</strong><br>` + `${d.start} - ${d.end}`)
              .style("display", "block");
          })
          .on("mousemove", function (event) {
            tooltip
              .style("left", event.pageX + 15 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mouseleave", function () {
            tooltip.style("display", "none");
          });

        conflictSquare
          .selectAll("text")
          .data(conflictData)
          .join("text")
          .attr("x", (d) => xScale(d.start) + 40)
          .attr("y", margin.top + 40)
          .text((d) => d.event)
          .attr("font-size", "20px")
          .attr("font-weight", "bold");
      }

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
        .range([whiteSpaceTop + focusHeight, whiteSpaceTop]);

      // Y Scale Context View
      const yContext = d3
        .scaleLinear()
        .domain([
          d3.min(series, (layer) => d3.min(layer, (d) => d[0])),
          d3.max(series, (layer) => d3.max(layer, (d) => d[1])),
        ])
        .range([
          whiteSpaceTop + focusHeight + contextHeight,
          whiteSpaceTop + focusHeight + contextMarginTop,
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

      // Draw Focus layers
      const tooltip = d3.select("#tooltip");

      const focusLine = svg
        .append("line")
        .attr("stroke", "black")
        .attr("stroke-dasharray", "3,3")
        .attr("y1", whiteSpaceTop)
        .attr("y2", whiteSpaceTop + focusHeight)
        .style("display", "none");

      svg
        .selectAll("path.area")
        .data(series)
        .join("path")
        .attr("fill", (d) => color(d.key))
        .attr("d", area)
        .attr("class", "area focus")
        .attr("clip-path", "url(#clip)")
        .on("mouseover", function () {
          tooltip.style("display", "block");
          focusLine.style("display", "block");
          d3.select(this).attr("stroke", "#000").attr("stroke-width", 1.5);
        })
        .on("mousemove", function (event, d) {
          const [mouseX] = d3.pointer(event);
          // const hoveredYear = Math.round(x.invert(mouseX));
          const hoveredYear = years.reduce((prev, curr) =>
            Math.abs(x.invert(mouseX) - curr) <
            Math.abs(x.invert(mouseX) - prev)
              ? curr
              : prev
          );

          const focusX = x(hoveredYear);
          focusLine.attr("x1", focusX).attr("x2", focusX);

          const noc = d.key;
          const countryName = nocToCountry[noc] || noc;

          const yearData = rawOlympicData.filter(
            (o) =>
              +o.Edition === hoveredYear && o.NOC === noc && o.Medal !== "NA"
          );

          if (yearData.length > 0) {
            const gold = yearData.filter((r) => r.Medal === "Gold").length;
            const silver = yearData.filter((r) => r.Medal === "Silver").length;
            const bronze = yearData.filter((r) => r.Medal === "Bronze").length;
            const total = gold + silver + bronze;

            tooltip
              .html(
                `<strong>${countryName}</strong><br>` +
                  `Year: ${hoveredYear}<br>` +
                  `Total Medals: ${total}<br>` +
                  `Gold: ${gold}<br>` +
                  `Silver: ${silver}<br>` +
                  `Bronze: ${bronze}`
              )
              .style("left", event.pageX + 15 + "px")
              .style("top", event.pageY - 28 + "px");
          } else {
            // No data — find nearest years with data
            const allYearsWithMedals = [
              ...new Set(
                rawOlympicData
                  .filter((o) => o.NOC === noc && o.Medal !== "NA")
                  .map((o) => +o.Edition)
              ),
            ].sort((a, b) => a - b);

            let lower = null;
            let higher = null;
            for (let y of allYearsWithMedals) {
              if (y < hoveredYear) lower = y;
              else if (y > hoveredYear && higher === null) higher = y;
            }

            let suggestion = "<i>No data available</i>";
            if (lower || higher) {
              suggestion += "<br>See ";
              suggestion += lower ? `${countryName} ${lower}` : "";
              if (lower && higher) suggestion += " or ";
              suggestion += higher ? `${higher}` : "";
            }

            tooltip
              .html(
                `<strong>${countryName}</strong><br>` +
                  `Year: ${hoveredYear}<br>` +
                  `${suggestion}`
              )
              .style("left", event.pageX + 15 + "px")
              .style("top", event.pageY - 28 + "px");
          }
        })
        .on("mouseleave", function () {
          // mouseleave also works for d3 to reduce tracking
          tooltip.style("display", "none");
          focusLine.style("display", "none");
          d3.select(this).attr("stroke", null).attr("stroke-width", null);
        });

      drawConflictOutline(x);

      //Create x axis with labels
      const xFocusAxis = svg
        .append("g")
        .attr("transform", `translate(0,${whiteSpaceTop + focusHeight})`)
        //.call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .call(d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d")))

        .attr("font-weight", "bold")
        .style("font-size", "15px");

      //Create y axis with no labels + ticks
      svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .select(".domain")
        .attr("stroke", "black")
        .attr("font-weight", "bold");

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
          `translate(0,${whiteSpaceTop + focusHeight + contextHeight})`
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
          [margin.left, whiteSpaceTop + focusHeight + contextMarginTop],
          [
            width - margin.right,
            whiteSpaceTop + focusHeight + contextHeight - 1,
          ],
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

          drawConflictOutline(x);
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
          .text(nocToCountry[key] || key)
          .attr("alignment-baseline", "middle")
          .attr("font-weight", "bold")
          .attr("font-size", "15px");
      });
    }
    makeStreamGraph(rawOlympicData, 12);
  })
  .catch(function (error) {
    console.error("Error:", error);
  });
