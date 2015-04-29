/**
 * An experimental look at coverage of issues in the media, in the run up to 
 * the UK 2015 General Election using BBC News Labs data.
 *
 * Iain Collins & Sylvia Tippmann
 */
var juicer = {
    apikey: '9OHbOpZpVh9tQZBDjwTlTmsCF2Ce0yGQ',
    host: "http://data.test.bbc.co.uk/bbcrd-juicer"
};

// Whitelist of IDs of media sources in the Juicer to use in our comparisons
var sources = [1, 3, 8, 10, 11, 12, 22, 23, 24, 40, 42, 43, 45, 71, 72, 85];

// An array of one or more currently selected sources
var currentlySelectedSources = sources;

// An array of paries with URIs, labels and colours for each one
var parties = [ { name: "Labour Party",
                  uri: "http://dbpedia.org/resource/Labour_Party_(UK)",
                  color: "#F42E22"
                },
                { name: "Conservative Party",
                  uri: "http://dbpedia.org/resource/Conservative_Party_(UK)",
                  color: "#1577C6"
                },
                { name: "UKIP",
                  uri: "http://dbpedia.org/resource/UK_Independence_Party",
                  color: "#703385"
                },
                { name: "Liberal Democrats",
                  uri: "http://dbpedia.org/resource/Liberal_Democrats",
                  color: "#FC8324"
                },
                { name: "Green Party",
                  uri: "http://dbpedia.org/resource/Green_Party_of_England_and_Wales",
                  color: "#7AC130"
                },
                { name: "Scottish National Party",
                  uri: "http://dbpedia.org/resource/Scottish_National_Party",
                  color: "#FFE100"
                }
              ];
          
// An array of topics, with a name and query for each topic
// NB: This is extermely subjective
var issues = [ {  name: "Education",
                  query: "education OR schools OR universities"
                },
                { name: "Immigration",
                  query: "immigration OR immigrants OR migrants"
                },
                { name: "Economy",
                  query: "economy OR economics"
                },
                { name: "Law and Order",
                  query: 'policing OR prisons'
                },
                { name: "Healthcare",
                  query: 'NHS OR "National Health Service" OR healthcare'
                },
                { name: "Pensions",
                  query: 'pension OR pensions'
                },
                { name: "European Union",
                  query: '"European Union" OR EU'
                },
                { name: "Taxation",
                  query: 'tax OR taxes OR taxation OR VAT'
                },
                { name: "Housing",
                  query: '"new houses" OR "new build" OR housing'
                }
              ];
              
var issuesGraphAxis = 0;
              
// Time bound start/end dates
var start = "2015-01-01T00:00:00.000Z";
var end = "2015-05-08T00:00:00.000";

/*
// @todo Not Implimented Yet
// Toggle view of data by gender
$(document).on("touch click", '#male', function(event) {
  $('#female').removeClass('active btn-primary');
  $('#male').toggleClass('active btn-primary');
});
$(document).on("touch click", '#female', function(event) {
  $('#male').removeClass('active btn-primary');
  $('#female').toggleClass('active btn-primary');
});
*/

// When an item in the dropdown list is selected update currentlySelectedSources
$(document).on("change", 'select[name="source"]', function(event) {
  if ($(this).val() == "all") {
    // If the value is "all" update currentlySelectedSources to contain all sources
    currentlySelectedSources = sources;
  } else {
    // Update currentlySelectedSources to contain only  the ID of the selected source
    currentlySelectedSources = [ $(this).val() ];
  }
  updatePage();
});

/**
 * On page load, get sources from the Juicer and update the page
 */
$(function() {
  getSourcesFromJuicer();
  updatePage();
});

/**
 * Get Juicer sources on load (to populate drop down)
 */
function getSourcesFromJuicer() {
  $("#juicer-loading").show();
  var juicerSources = $("#juicer-sources");
  juicerSources.html('<br/><p class="lead text-center">Updating sources...</p>')
  $.ajax({
    url: juicer.host+"/sources?apikey="+juicer.apikey,
    type: "GET",
    dataType: 'json',
    cache: false, // Append timestamp
    success: function(response) {
      var select = $('select[name="source"]');
      $.each(response, function(key, value) {
        
        // Only show white listed sources
        if ($.inArray(value.id, sources) < 0)
          return;
        
          select.append($("<option></option>")
                .attr("value",value.id)
                .text(value.name)); 
      });
      select.selectpicker({ style: 'btn-default btn-lg', size: 10 });
    },
    error: function() {
    }
  });
};

/**
 * Update the page (resets all graphs and shows loading graphics)
 */
function updatePage() {
  // Dimm all graphs and show all loading graphics while they are being redrawn
  $(".graph").css({ opacity: 0.2 });
  $(".legend").css({ opacity: 0.2 });
  $("#parties-loading").show();
  $("#issues-timeseries-loading").show();

  drawPartiesGraphs(parties, currentlySelectedSources);
  drawIssuesGraphs(issues, currentlySelectedSources);
}

/**
 * Plot the graph and pie chart showing mentions of parties
 */
function drawPartiesGraphs(things, sources) {
  var promises = [];
  var timeseries = [];

  $(things).each(function(index, thing) {
    var promise = getMentions(thing, sources, start, end, timeseries);
    promises.push(promise);
  });
  
  $.when.apply($, promises).then(function(data) {
    
        var totals = [];
      
        // Sort by most results
        timeseries.sort(function(a,b) { return b.total - a.total; } );
      
        var colors = [];
        $(timeseries).each(function(index, thing) {
          totals.push({ label: thing.label, data: [ thing.total] });
          colors.push(thing.color);
        });
        
       // Draw graph
       var graph = $.plot("#parties .graph",
                          timeseries,
                          {
                           shadowSize: 0,
                           colors: colors,
                           grid: { borderWidth: 0 },
                           xaxis: {  mode: "time",
                                    //tickLength: 1,
                                    timeformat: "%d<br>%b", // @todo Add %Y if start+end years differ
                                    minTickSize: [10, 'day']
                            },
                            yaxis: { tickLength: 0,
                                     tickDecimals: 0
                            },
                            lines: {
                              show: true,
                              steps: false,
                              lineWidth: 2.5,
                              fill: false
                            },
                            legend: { show: true,
                                      container: $("#parties-legend"),
                                      placement: 'outsideGrid',
                                      labelBoxBorderColor: "transparent",
                                      backgroundOpacity: 0,
                                      labelFormatter: function(label, series) { return "&nbsp; "+label; }
                             }
                        });
                        
     var graph = $.plot("#parties-pie .graph",
                        totals,
                        {
                         shadowSize: 0,
                         colors: colors,
                         grid: { borderWidth: 0 },
                         xaxis: { mode: "time",
                                  tickLength: 0,
                                  timeformat: "%d<br>%b", // @todo Add %Y if start+end years differ
                                  minTickSize: [5, 'day'], 
                          },
                          yaxis: { tickLength: 0,
                                   tickDecimals: 0,
                                   minTickSize: 1
                          },
                          lines: {
                            show: true,
                            steps: false,
                            lineWidth: 3,
                            fill: false
                          },
                          legend: { show: false,
                           },
                           series: {
                               pie: {
                                   show: true,
                                   innerRadius: 0.3,
                                   label: {
                                     formatter: function(label, series) { return ""; },
                                   }
                               }
                           }
                           
                      });
       
       $("#parties-loading").hide();
       $("#parties .graph").css({ opacity: 1 });
       $("#parties-legend").css({ opacity: 1 });
       $("#parties-pie .graph").css({ opacity: 1 });
       
  }, function(e) {
     console.log("Request failed");
  });
}


/**
 * Plot the bar charts for mentions of issues
 */
function drawIssuesGraphs(issues, sources) { 
  var promises = [];
  var timeseries = [];
  var issueTotalsData = [];
  
  $(issues).each(function(index, issue) {
    timeseries[index] = [];
    var promise = getMentions(issue, sources, start, end, timeseries[index]);
    promises.push(promise);
  });
  
  $.when.apply($, promises).then(function(data) {
      var maxGraphYAxis = 10;
      var colors = [];
      
      $('#issues-timeseries').html('');
      $(timeseries).each(function(index, thing) {
        //issueTotalsData.push( { label: thing[0].label, data: [ thing[0].total ] });
        issueTotalsData.push([ thing[0].label, thing[0].total ]);
         var html ='<div id="issue-'+index+'" class="col-md-4 col-sm-12 col-xs-12 pull-left sort" data-sort="'+thing[0].total+'">'
                  +'  <h3 class="text-muted text-center">'+thing[0].label+'</h3>'
                  +'  <div class="graph" style="height: 200px;"></div>'
                  +'  <br/><br/>'
                  +'</div>';
         $('#issues-timeseries').append(html);
         
         $(thing[0].data).each(function(index, object) {
           if (object[1] > maxGraphYAxis)
             maxGraphYAxis = object[1];
         });
      });

     // Draw graph
      $(timeseries).each(function(index, thing) {
        $.plot('#issue-'+index+' .graph',
          timeseries[index],
          {
             shadowSize: 0,
             colors: [ "#CA0914" ],
             grid: { borderWidth: 0 },
             xaxis: { mode: "time",
                      tickLength: 0,
                      timeformat: "%d<br>%b", // @todo Add %Y if start+end years differ
                      minTickSize: [5, 'day'], 
              },
              yaxis: { tickLength: 0,
                       tickDecimals: 0,
                       minTickSize: 1,
                       max: maxGraphYAxis
              },
              bars: {
                show: true,
                steps: false,
                lineWidth: 3,
                fill: true
              },
              legend: { show: false }
          });
      });
  
     /*
     // Sort graphs of issues by most mentions first
     var wrapper = $('#issues-timeseries');
     wrapper.find('div.sort').sort(function (a, b) {
       return $(b).attr('data-sort') - $(a).attr('data-sort');
     })
     .appendTo( wrapper );
     */
     
     // Sort totals graph by most results
     // issueTotalsData.sort(function(a,b) { return b[1] - a[1]; } );
     
     $.plot('#issues-totals', [ issueTotalsData ], {
         shadowSize: 0,
         colors: [ "#CA0914" ],
         grid: { borderWidth: 0 },
         legend: { show: false },
         bars: {
           show: true,
           barWidth: 0.6,
           align: "center",
            lineWidth: 2,
            fill: true,
           fillColor: "#CA0914"
         },
         yaxis: {
             tickLength: 0,
         },
         xaxis: {
            mode: "categories",
             tickLength: 0
         }
     });

     $("#issues-timeseries-loading").hide();
     $("#issues-totals").css({ opacity: 1 });

  }, function(e) {
     console.log("Request failed");
  });
}

/**
 * Get mentions for one or more URIs and/or a query in the Juicer
 */
function getMentions(thing, sources, start, end, timeseries, size) {
  if (!size)
    size = 0;
  
  var url = juicer.host+"/articles?size="+size+"&published_before="+end+"&published_after="+start+"&apikey="+juicer.apikey;
  
  $(sources).each(function(index, source) {
    url += "&sources[]="+source;
  });
  
  // ALlow thing.uri to be string with a URI OR array of strings containing URIs
  if (thing.uri && !$.isArray(thing.uri))
    thing.uri = [ thing.uri ];
  
  $(thing.uri).each(function(index, uri) {
    url += "&facets[]="+encodeURIComponent(thing.uri)
  });
    
  if (thing.query)
    url += "&q="+encodeURIComponent(thing.query)

  return $.ajax({
    url: url,
    type: "GET",
    dataType: 'json',
    cache: false, // Append timestamp
    success: function(response) {
      var t = { data: [], label: thing.name, color: thing.color, total: response.total };
      $(response.timeseries).each(function(index, object) {
        t.data.push([object.key, object.doc_count]);
      });
      timeseries.push(t);
    }
  });
}