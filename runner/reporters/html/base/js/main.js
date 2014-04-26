/*jshint browser: true,jquery: true*/
/*global d3*/
(function() {
    var Mimik = function() {};
    Mimik.prototype.init = function() {
        var me = this;
        // hook up menu interaction
        $('.main-menu-button').on('mouseover', $.proxy(me.hintMenu, me));
        $('.main-menu-button').on('mouseout', $.proxy(me.hideMenu, me));
        $('.main-menu-button').on('click', $.proxy(me.openMenu, me));
        $('.close-menu').on('click', $.proxy(me.closeMenu, me));
        $('.code-error-message').on('click', $.proxy(me.toggleStackTrace, me));
        me.initScreenshots();
    };
    Mimik.prototype.hintMenu = function() {
        $('.main-menu-button:not(.opened)').addClass('hinted');
        $('.sidebar-container:not(.opened)').addClass('hinted');
    };
    Mimik.prototype.hideMenu =  function() {
        $('.main-menu-button').removeClass('hinted');
        $('.sidebar-container').removeClass('hinted');
    };
    Mimik.prototype.openMenu =  function() {
        this.hideMenu();
        $('.main-menu-button').addClass('opened');
        $('.sidebar-container').addClass('opened');
        $('.report-header .report-title').addClass('opened');
        $('.main-container').addClass('opened');
    };
    Mimik.prototype.closeMenu =  function() {
        $('.main-menu-button').removeClass('opened');
        $('.sidebar-container').removeClass('opened');
        $('.report-header .report-title').removeClass('opened');
        $('.main-container').removeClass('opened');
    };
    Mimik.prototype.toggleStackTrace =  function(e) {
        var el = $(e.target).parents('.code-error'),
            icon = el.find('.code-collapsible-stack-icon');
        e.preventDefault();
        if(icon.hasClass('fa-chevron-circle-right')) {
            // expand
            icon.removeClass('fa-chevron-circle-right');
            icon.addClass('fa-chevron-circle-down');
            el.find('.code-error-stack').slideDown(200);
        } else {
            // collapse
            icon.removeClass('fa-chevron-circle-down');
            icon.addClass('fa-chevron-circle-right');
            el.find('.code-error-stack').slideUp(200);
        }
    };
    Mimik.prototype.initScreenshots = function() {
        $("a[rel^='screenshot']").prettyPhoto({
            opacity: 0, /* Value between 0 and 1 */
            social_tools: ''
        });
    };
    $(document).ready(function() {
        var mimik = new Mimik();
        mimik.init();
    });
})();

var data = [
    { label: 'Passed', value: 80 },
    { label: 'Skipped', value: Math.round(Math.random() * 4) },
    { label: 'Failed', value: Math.round(Math.random() * 8) }
];
var config = {
    width: 200,
    height: 200,
    colors: ['#80C080','#56B9F0','#F07777']
};

function renderPie(data, config) {

    function getLabel(d, config) {
        var threshold = config.threshold || 0;
        var toPercent = d3.format(config.round ? '%' : '.01%');
        var percent = d.value / config.total;
        var labelTypes = {
            "label" : d.label || (d.data && d.data.label) || '',
            "value": d.value,
            "percent": toPercent(percent)
        };
        return (typeof d.value === 'number' && percent >= threshold) ? labelTypes[config.type || 'value'] : '';
    }
    
    function pieTween(d) {
        var s0 = 2 * Math.PI,
            e0 = 2 * Math.PI,
            fn = d3.interpolate(
                { startAngle: s0, endAngle: e0 }, 
                { startAngle: d.startAngle, endAngle: d.endAngle }
            );
        return function(t) {
            var b = fn(t);
            return arc(b);
        };
    }
        
    var radius = Math.min(config.width, config.height) / 2,
        outerRadius = radius-10,
        donutRatio = 0.5,
        innerRadius = outerRadius * donutRatio,
        tweenDuration = 350;

    var color = d3.scale.ordinal()
        .range(config.colors);

    // Setup the Pie chart and choose the data element
    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return d.disabled ? 0 : d.value; });

    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    var svg = d3.select("#chart").append("svg")
        .attr("width", radius * 2)
        .attr("height", config.height)
        .append("g")
        .attr("transform", "translate(" + radius + "," + config.height / 2 + ")");

//////////////////////////////////////////////
// RENDER PIE CHART //////////////////////////
//////////////////////////////////////////////

    var g = svg.selectAll(".arc")
            .data(pie(data));

    g.enter().append("g")
        .attr("class", "arc")
        .transition()
            .duration(tweenDuration)
            .attrTween("d", pieTween);

    g.append("path")
            .attr("fill", function(d, i) { return color(i); })
            .attr("d", arc)
            .on('mouseover', function () {
                d3.select(this).attr('opacity', 0.8);
            }).on('mouseout', function() {
                d3.select(this).attr('opacity', 1);
            })
            .call(
                d3.helper.tooltip()
                .text(function(d){
                    var total= d3.sum(data, function(d){ return d.value; });
                    return d.data.label + ': ' + getLabel(d, { total: total, type: 'percent', round: true });
                 })
            )
            .transition()
                .duration(tweenDuration)
                .attrTween("d", pieTween);

    g.append("text")
            .attr("transform", function(d) { 
                return "translate(" + arc.centroid(d) + ")"; 
            })
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .attr('fill', 'white');
            // .text(function(d) {
            //     var total= d3.sum(data, function(d){ return d.value; });
            //     return getLabel(d, { total: total, type: 'percent', round: true, threshold: 0.04 });
            // });
            
    g.exit()
        .transition()
            .duration(tweenDuration)
            .attrTween("d", pieTween)
        .remove();

//////////////////////////////////////////////
// RENDER PASSED TEST INFO ///////////////////
//////////////////////////////////////////////

    svg
        .append("text")
        .attr('class', 'pie-percent')
        .style("text-anchor", "middle")
        .text(function() {
            var total= d3.sum(data, function(d){ return d.value; });
            return getLabel(data[0], { total: total, type: 'percent', round: true});
        });
    svg
        .append("text")
        .attr("dy", "1.3em")
        .style('text-anchor', 'middle')
        .attr('class', 'pie-label')
        .text('Passed');

//////////////////////////////////////////////
// RENDER LEGEND /////////////////////////////
//////////////////////////////////////////////

    var legend = d3.select("#chart").append("svg")
          .attr("width", 100 )
          .attr("height", config.height)
        .selectAll("g")
    .data(data)//.reverse())
        .enter().append("g")
          .attr("transform", function(d, i) { return "translate(0," + (config.height/2 - (18*3/2) + i * 20 ) + ")"; });

    legend.append("circle")
        .attr("r", 6)
        .attr("cx", 14)
        .attr("cy", '.55em')
        .style("fill", function(d, i) { return color(i); });

    legend.append("text")
          .attr("x", 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .text(function(d) { return d.label; });

}

d3.helper = {};

    d3.helper.tooltip = function(){
        var tooltipDiv;
        var bodyNode = d3.select('#chart').node();
        var attrs = { 'class': 'tooltip'};
        var text = '';
        var styles = {};

        function tooltip(selection){

            selection.on('mouseover.tooltip', function(pD, pI){
                // Clean up lost tooltips
                d3.select('#chart').selectAll('div.tooltip').remove();
                // Append tooltip
                tooltipDiv = d3.select('#chart').append('div');
                tooltipDiv.attr(attrs).style(styles);
                var absoluteMousePos = d3.mouse(bodyNode);
                tooltipDiv.style({
                    left: (absoluteMousePos[0] + 10)+'px',
                    top: (absoluteMousePos[1] - 15)+'px',
                    position: 'absolute',
                    'z-index': 1001
                });
                // Add text using the accessor function, Crop text arbitrarily
                tooltipDiv.style('width', function(){ return (text(pD, pI).length > 80) ? '300px' : null; })
                    .html(function(){return text(pD, pI);}).style("opacity", 0);
                tooltipDiv.transition()
                          .duration(300)
                          .style("opacity", 1);
            })
            .on('mousemove.tooltip', function(pD, pI){
                // Move tooltip
                var absoluteMousePos = d3.mouse(bodyNode);
                tooltipDiv.style({
                    left: (absoluteMousePos[0] + 10)+'px',
                    top: (absoluteMousePos[1] - 15)+'px'
                });
                // Keep updating the text, it could change according to position
                tooltipDiv.html(function(){ return text(pD, pI); });
            })
            .on('mouseout.tooltip', function(){
                tooltipDiv.transition()
                          .duration(300)
                          .style("opacity", 0).remove();
                // Remove tooltip
                //tooltipDiv.remove();
            });

        }

        tooltip.attr = function(_x){
            if (!arguments.length) {
                return attrs;
            }
            attrs = _x;
            return this;
        };

        tooltip.style = function(_x){
            if (!arguments.length) {
                return styles;
            }
            styles = _x;
            return this;
        };

        tooltip.text = function(_x){
            if (!arguments.length) {
                return text;
            }
            text = d3.functor(_x);
            return this;
        };

        return tooltip;
    };



    renderPie(data, config);
