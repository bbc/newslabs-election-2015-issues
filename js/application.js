
var juicer = {
    apikey: '9OHbOpZpVh9tQZBDjwTlTmsCF2Ce0yGQ',
    host: "http://data.test.bbc.co.uk/bbcrd-juicer"
};

// IDs of media sources to use
var sources = [1, 3, 8, 10, 11, 12, 14, 22, 23, 24, 40, 41, 42, 43, 44, 45, 70, 71, 72, 85, 89, 160, 166];
var selectedSources = sources;

// URIs of political parties to include in comparison chart
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
              
var issues = [ {  name: "Education",
                  query: "education OR schools OR university OR universities"
                },
                { name: "Immigration",
                  query: "immigration OR immigrants OR migrants"
                },
                { name: "Economy",
                  query: "economy OR economics"
                },
                { name: "Law and Order",
                  query: "crime OR policing OR prisons"
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
                  query: 'tax OR taxation'
                },
                { name: "Housing",
                  query: 'houses OR house OR housing'
                }
              ];
              
var issuesGraphAxis = 0;
              
// Time bound start/end dates
var start = "2015-01-01T00:00:00.000Z";
var end = "2015-05-08T00:00:00.000";

$(document).on("touch click", '#male', function(event) {
  $('#female').removeClass('active btn-primary');
  $('#male').toggleClass('active btn-primary');
});

$(document).on("touch click", '#female', function(event) {
  $('#male').removeClass('active btn-primary');
  $('#female').toggleClass('active btn-primary');
});

$(document).on("change", 'select[name="source"]', function(event) {
  if ($(this).val() == "all") {
    selectedSources = sources;
  } else {
    selectedSources = [ $(this).val() ];
  }
  updatePage();
});


$(function() {
  getSourcesFromJuicer();
  updatePage();
});

function getSourcesFromJuicer() {
  $("#juicer-loading").slideDown();
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
        
        // Only show whitelisted sources
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

function updatePage() {
  $("#parties-loading").slideDown();
  $("#issues-timeseries-loading").slideDown();

  plotPartiesGraph(parties, selectedSources);  
  plotIssuesTimeseries(issues, selectedSources);
}

function plotPartiesGraph(things, sources) {
  var graphOptions = {
       shadowSize: 0,
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
        legend: { show: true,
                  container: $("#parties .legend"),
                  placement: 'outsideGrid',
                  labelBoxBorderColor: "transparent",
                  backgroundOpacity: 0,
                  labelFormatter: function(label, series) { return "&nbsp; "+label; }
         }
  };
  var promises = [];
  var timeseries = [];

  $(things).each(function(index, thing) {
    var promise = getMentions(thing, sources, start, end, timeseries);
    promises.push(promise);
  });
  
  $.when.apply($, promises).then(function(data) {
    
        // Sort by most results
        timeseries.sort(function(a,b) { return b.total - a.total; } );
      
        var colors = [];
        $(timeseries).each(function(index, thing) {
          colors.push(thing.color);
        });
        graphOptions.colors = colors;
                
       // Draw graph
       var graph = $.plot("#parties .graph", timeseries, graphOptions);
       
       $("#parties-loading").slideUp();
       
  }, function(e) {
     console.log("Request failed");
  });
}


function plotIssuesTimeseries(issues, sources) {
  var graphOptions = {
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
                 minTickSize: 1
        },
        bars: {
          show: true,
          steps: false,
          lineWidth: 3,
          fill: true
        },
        legend: { show: false }
  };  
  var promises = [];
  var timeseries = [];
  var issueTotalsData = [];
  
  $('#issues-timeseries').html('');
  
  $(issues).each(function(index, issue) {
    timeseries[index] = [];
    var promise = getMentions(issue, sources, start, end, timeseries[index]);
    promises.push(promise);
  });
  
  $.when.apply($, promises).then(function(data) {
      var maxGraphYAxis = 10;
      var colors = [];
      
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

      graphOptions.yaxis.max = maxGraphYAxis;

     // Draw graph
      $(timeseries).each(function(index, thing) {
        var graph = $.plot('#issue-'+index+' .graph', timeseries[index], graphOptions);
      });
  
      /*
     var wrapper = $('#issues-timeseries');
     wrapper.find('div.sort').sort(function (a, b) {
       return $(b).attr('data-sort') - $(a).attr('data-sort');
     })
     .appendTo( wrapper );
      */
     
     // Sort by most results
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
         // series: {
         //     pie: {
         //         show: true,
         //         innerRadius: 0.3,
         //     }
         // }
     });
     
     $("#issues-timeseries-loading").slideUp();

  }, function(e) {
     console.log("Request failed");
  });
}

function getMentions(thing, sources, start, end, timeseries) {
  var url = juicer.host+"/articles?size=0&published_before="+end+"&published_after="+start+"&apikey="+juicer.apikey;
  
  $(sources).each(function(index, source) {
    url += "&sources[]="+source;
  });

  if (thing.uri)
    url += "&facets[]="+encodeURIComponent(thing.uri)
    
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