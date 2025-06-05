# ECS163-FinalProject


# Description
Our html to display all of the svgs in our slideshow as well as our navigation logic is in <code>index.html</code>. Our code for the scatter plots and our static stream graph can be found in our <code>main.js</code> file, and our interactive dashboard with the heatmap can be found in <code>dashboard_main.js</code>. Our primary visualization, the interactive stream graph, can be found in <code>stream_main.js</code>. 

We decided to separate our code in this way so that our interactive visualizations were in distinct folders from our static ones, in order to mitigate unwanted interference with our static visualizations. This did come at the cost of rewriting the same code in some places, but we wanted to prioritize modularity and reliability. This also allowed our group members to work on different pieces at the same time, without worrying about merging the files in git. 

# Installation
To install and set up our slideshow, you need to clone the repository by running <br> <code>git clone https://github.com/cassiehopkin/ECS163-FinalProject.git</code> <br>  <code>cd ECS163-FinalProject</code> <br> After this, the slideshow should be ready to go.


# Execution
Once the repo has been cloned, you can open the project in VS Code and right click on the <code>index.html</code> and select "Open with Live Server" (if this doesn't pop up you need to download Live Server in VS Code). Then you can see our project in your web browser!
