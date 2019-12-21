var theProtocol;

if (window.location.protocol == "https:") {
  theProtocol = "https";
} else {
  theProtocol = "http";
}

function anyCannabisPermitChecked() {
  var checkBoxes = $('input:checkbox');
  var cannabisPermitCheckboxes = [];
  var cannabisRetailIds = ['submitted', 'onHold', 'processing', 'underConstruction', 'approved'];
  cannabisRetailIds.forEach(function (id) {
    cannabisPermitCheckboxes.push(document.getElementById(id));
  });
  return cannabisPermitCheckboxes.some(function (checkbox) {
    return checkbox.checked;
  })
}

require(["esri/Map", "esri/views/MapView", "esri/layers/FeatureLayer", "esri/layers/MapImageLayer", "esri/widgets/BasemapToggle", "esri/renderers/SimpleRenderer", "esri/tasks/IdentifyTask", "esri/tasks/support/IdentifyParameters", "esri/geometry/geometryEngine", "esri/geometry/Polygon", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/renderers/SimpleRenderer"], function (Map, MapView, FeatureLayer, MapImageLayer, BasemapToggle, SimpleRenderer, IdentifyTask, IdentifyParameters, geometryEngine, Polygon, QueryTask, Query, SimpleRenderer) {

  var UICtrl = function () {
    var mediaQuery = window.matchMedia("(max-width: 992px)");
    var uiSelectors = {
      searchBox: '#searchbox',
      filterContainer: '#filter-container',
      mobileSelectedTab: '#mobile-selected-tab',
      mobileLegend: '#mobile-legend',
      filterContainer: '#filter-container',
      tabDisplayContainer: '.tab-display-container',
      modalTitle: '.modal-title',
      modalBody: '.modal-body',
      modalDisplay: '#modalDisplay',
      mobileFilterContainer: '#filter-container',
      mobileFilterElements: '#filter-elements',
      legendTab: '#legend-tab',
      locationTab: '#location-tab',
      alertMobile: '#alert',
      esriBasemapToggle: '.esri-basemap-toggle',
      esriBasemapThumbnailImage: '.esri-basemap-thumbnail__image'
    }

    function applyMediaQuery() {
      var mobileSelectedTab = $(uiSelectors.mobileSelectedTab);

      if (mediaQuery.matches) {
        var filterContainerHtml = $(uiSelectors.filterContainer);
        mobileSelectedTab.html(filterContainerHtml);
        mobileSelectedTab.css('position', 'absolute');
      } else {
        mobileSelectedTab.css('display', 'none')
      }
    }

    return {
      getUiSelectors: function() {
        return uiSelectors;
      },
      hideMobileMenu: function() {
        $(uiSelectors.filterContainer).css('display', 'none');
        $(uiSelectors.mobileLegend).css('display', 'none');
        $(uiSelectors.tabDisplayContainer).css('display', 'none');
      },
      
      displayModal: function(titleStr, bodyStr) {
        console.log('in display modal')
        $(uiSelectors.modalBody).html(bodyStr);
        $(uiSelectors.modalTitle).html(titleStr);
        $(uiSelectors.modalDisplay).modal('show');
      },

      listenForMobileAlert: function() {
        $(uiSelectors.alertMobile).click(function() {
          console.log('you cliekd on alert')
          var disclaimerMessage = 'Map Layers include 600 ft buffers aroud the property. Use this map only as an estimate <br><br> Contact SF Planning to confirm eligibility of a location';
          $(uiSelectors.modalBody).html(disclaimerMessage);
          $(uiSelectors.modalTitle).html('');
          $(uiSelectors.modalDisplay).modal('show');

        });
      },
      listenForScrollingForLocationMenu: function () {

        $(uiSelectors.mobileFilterContainer).scroll(function () {
          if (Math.ceil($(this).scrollTop()) + Math.ceil($(uiSelectors.mobileFilterContainer).height()) === this.scrollHeight) {
            // at bottom of scroll 
            // $(this).css('box-shadow', 'inset 0 -10px 10px -10px #000000' )
            $(this).css('box-shadow', 'inset 0px 40px 41px -44px rgba(0,0,0,0.75)')
          } else if ($(this).scrollTop() + $(this).height() === $(uiSelectors.mobileFilterContainer).height()) {
            // at top of scroll
            $(this).css('box-shadow', 'inset 0px -40px 41px -44px rgba(0,0,0,0.75)')

          } else if (Math.ceil($(this).scrollTop()) + Math.ceil($(uiSelectors.mobileFilterContainer).height()) < this.scrollHeight) {
            $(this).css('box-shadow', 'inset 0px 40px 41px -44px rgba(0,0,0,0.75), inset 0px -40px 41px -44px rgba(0,0,0,0.75)')
          }

        });
      },
      displayMobileDisclaimer: function() {
        var disclaimerMessage = 'Map Layers include 600 ft buffers aroud the property. Use this map only as an estimate <br><br> Contact SF Planning to confirm eligibility of a location';
        this.displayModal('', disclaimerMessage)
      },

      highLightClickedTab: function (clickedElement) {
        var tmpClickElement = clickedElement;
        var clickedElementClassName = tmpClickElement.className;
        // console.log(tmpClickElement)
        
        if (clickedElementClassName.indexOf('legend-element') === -1) {
          var textInside = tmpClickElement.textContent;
          if (textInside === 'Legend') {
            tmpClickElement = $(uiSelectors.legendTab)[0];
          } else if (textInside === 'Locations') {
            tmpClickElement = $(uiSelectors.locationTab)[0];
          }
        }
        
        var clickingOnSelectedTab = tmpClickElement.classList.contains('selected')
        if (clickingOnSelectedTab) {
          $(uiSelectors.tabDisplayContainer).css('display', 'none');
          tmpClickElement.classList.remove('selected');
        } else {
          $(uiSelectors.tabDisplayContainer).css('display', 'block');

          var legendElements = $('.legend-element');
          for (var i = 0; i < legendElements.length; i++) {
            legendElements[i].classList.remove('selected');
          }
          tmpClickElement.classList.add('selected');
        }
      },

      changeToNewMapHeightMobile: function() {
        console.log('in change to new map heght mobile')
        var popupHeight = $('.esri-popup__main-container').height();
        console.log(popupHeight)
        var contentContainerHeight = $ ('.content-container').height();
        console.log(contentContainerHeight)
        var newMapHeight = contentContainerHeight - popupHeight;
        console.log(newMapHeight)
        $('.map-container').css('height', newMapHeight.toString())

      },

      changeToNewMapHeight: function() {
        var mobileMenuHeight = $('.menu-mobile').height();
        var contentContainerHeight = $ ('.content-container').height();
        var newMapHeight = contentContainerHeight - mobileMenuHeight;
        $('.map-container').css('height', newMapHeight.toString())
      },

      showLegendOnMobileTab: function (clickedElement) {
        console.log(clickedElement)
        $(uiSelectors.mobileLegend).css('display', 'block');
        $(uiSelectors.filterContainer).css('display', 'none');
    
      },

      showFilterOnMobileTab: function (clickedElement) {
        $(uiSelectors.mobileLegend).css('display', 'none');
        $(uiSelectors.filterContainer).css('display', 'block');
      },

      listenForMediaQuery: function () {
        // applyMediaQuery();
        // mediaQuery.addListener(applyMediaQuery)
      }
    }
  }();

  var MapCtrl = function () {

    var CANNABIS_RETAIL_SERVICE_URL = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetailDev/MapServer';
    var map, view;
    var mapImageLayer;
    var cannabisPermitedLayer, cannabisPermittedWithCuLayer, cannabisPermittedWithMicrobusinessLayer
    var CANNABIS_PERMITTED_LAYER_NUM, CANNABIS_PERMITTED_WITHCU_LAYER_NUM, CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM;

    var polygonLayerAddedToMap;

    var mcdLayerNum, schoolLayerNum;
    var mcdBufferLayerNum, schoolBufferLayerNum;
    var onHoldBuffLayerNum, processBuffLayerNum, submittedBuffLayerNum, approvedBuffLayerNum, underConstructionBuffLayerNum;
    var onHoldLayerNum, processLayerNum, submittedLayerNum, approvedLayerNum, underConstructionLayerNum;
    var supervisorDistLayerNum;
    var cannabisLocationsLayer;
    var parcelLabelLayerNum;


    var PERMITTED_MAPIMAGE_LAYER_NUM = 3;
    var PERMITED_WITH_CU_MAPIMAGE_LAYER_NUM = 2;
    var PERMITED_WITH_MICRO_BUS_MAPIMAGE_LAYE_NUM = 1;
    var ZONING_DISTRICT_MAPIMAGE_LAYER_NUM = 0;

    var labelingForCannabisLayers = {
      symbol: {
        type: "text", // autocasts as new TextSymbol()
        color: "black",
        haloColor: "white",
        haloSize: 0.75,
        font: {
          // autocast as new Font()
          family: "Arial",
          size: 8,
          // weight: "bold"
        }
      },
      labelPlacement: "always-horizontal",
      labelExpression: "[dba_name]"
    }


    map = new Map({
      basemap: 'gray-vector'
    });

    view = new MapView({
      container: 'map',
      map: map,
      center: [-122.45, 37.76],
      zoom: 12,
    });

    map.basemap.thumbnailUrl = '../images/Globe-bkg.svg'

    mapImageLayer = new MapImageLayer({
      url: CANNABIS_RETAIL_SERVICE_URL,
    });

    var basemapToggle = new BasemapToggle({
      view: view,
      nextBasemap: "hybrid"
    });




    view.when(function () {
      view.on('click', executeIdentifyTask);
      // if (isSmallView) {
      //   UICtrl.changeToNewMapHeight();
      // }
    });

    view.ui.add(basemapToggle, "top-right");


    mapImageLayer.when(function () {
      var OPACITY_65 = 0.65;
      var OPACITY_50 = 0.50;

      var OPACITY_FOR_ZONING_LAYERS = 0.50;

      var zoningLayersForOpacity = ['Permitted', 'PermittedWithCU', 'PermittedWithMicrobusiness']

      var layersWithOpacity65 = [
        'CannabisLocations_OOC_600ft_Buffer - Submitted',
        'CannabisLocations_OOC_600ft_Buffer - Processing',
        'CannabisLocations_OOC_600ft_Buffer - Under Construction',
        'CannabisLocations_OOC_600ft_Buffer - Approved',
        'SchoolsPublicPrivateDec2015_600ftBuffer_KThru12',
        'MCD_600ftBuffer',
        'CannabisLocations_OOC_600ft_Buffer - On Hold'

      ]

      layersWithOpacity50 = [
      ]


      mapImageLayer.sublayers.items.forEach(function (layer) {
        if (layersWithOpacity65.indexOf(layer.title) !== -1) {
          layer.opacity = OPACITY_65;
        } else if (zoningLayersForOpacity.indexOf(layer.title) !== -1) {
          layer.opacity = OPACITY_FOR_ZONING_LAYERS;
        } else if (layersWithOpacity50.indexOf(layer.title) !== -1) {
          layer.opacity = OPACITY_50;

        }
      })
 
      assignLayerNumbersBasedOnNames(mapImageLayer);
      populateCheckboxes();

      cannabisPermitedLayer = new FeatureLayer({
        url: CANNABIS_RETAIL_SERVICE_URL + '/' + CANNABIS_PERMITTED_LAYER_NUM
      });

      cannabisPermittedWithCuLayer = new FeatureLayer({
        url: CANNABIS_RETAIL_SERVICE_URL + '/' + CANNABIS_PERMITTED_WITHCU_LAYER_NUM
      });

      cannabisPermittedWithMicrobusinessLayer = new FeatureLayer({
        url: CANNABIS_RETAIL_SERVICE_URL + '/' + CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM
      });

      cannabisFeatureLayersArr = [cannabisPermitedLayer, cannabisPermittedWithCuLayer, cannabisPermittedWithMicrobusinessLayer];

    });
    map.add(mapImageLayer);

    function createElementWithClassName(elementType, className) {
      var element = document.createElement(elementType);
      element.setAttribute('class', className);
      return element;
    }

    function isSmallView() {
      var windowWidth = window.innerWidth;
      console.log(windowWidth)
      return windowWidth < 992 ?  true : false;
    }

    function populateCheckboxes() {

      var retailPermitsLayerArr = [
        { idName: 'submitted', layerNum: submittedLayerNum, text: 'Submitted' },
        { idName: 'processing', layerNum: processLayerNum, text: 'Processing' },
        { idName: 'underConstruction', layerNum: underConstructionLayerNum, text: 'Under Construction' },
        { idName: 'onHold', layerNum: onHoldLayerNum, text: 'On Hold' },
        { idName: 'approved', layerNum: approvedLayerNum, text: 'Approved' }
      ]

      var checkboxElement = document.getElementById('filter-container');
      var retailCannabisDiv = createElementWithClassName('div', 'retail-cannabis-checkbox');
      var retailCannabisHtml = '';
      var disclaimerDiv = createElementWithClassName('div', 'disclaimer');
      var imageDiv = createElementWithClassName('div', 'image-container');

      var legendImage = new Image();
      // imageDiv.innerHTML = '<div class="filter-category-name">Medical Cannabis Dispensaries</div>';
      legendImage.src = 'legend.png';
      imageDiv.appendChild(legendImage)

      var imageHtml =
        '<div class="filter-category-name">Zoning Permission</div>' +

        '<div class="zoning-permissions">' +
        '<div class="each-permission">' +
        '<div class="permission-symbol">' +
        '<img src="zone_permitted.png" alt="">' +
        '</div >' +
        '<div class="permission-text">Principally Permitted</div>' +
        '</div>' +
        '</div>' +

        '<div class="zoning-permissions">' +
        '<div class="each-permission">' +
        '<div class="permission-symbol">' +
        '<img src="zone_conditional_use.png" alt="">' +
        '</div >' +
        '<div class="permission-text"> Permitted with Conditional Use Authorization</div>' +
        '</div>' +
        '</div>' +

        '<div class="zoning-permissions">' +
        '<div class="each-permission">' +
        '<div class="permission-symbol">' +
        '<img src="zone_microbusiness.png" alt="">' +
        '</div >' +
        '<div class="permission-text">Permitted with Microbusiness</div>' +
        '</div>' +
        '</div>' +

        '</div>'
      imageDiv.innerHTML = imageHtml
      disclaimerDiv.innerHTML =
        'Map layers include 600ft buffers<br> ' +
        ' around the property. Use this map only<br>' +
        ' as an estimate. <a href="https://sfplanning.org/location-and-hours" target="_blank">Contact SF Planning</a> to' +
        ' confirm eligibility of location'
      retailCannabisHtml += '<div class="filter-category-name">Retail Cannabis Permits</div>'
      retailPermitsLayerArr.forEach(function (item) {
        retailCannabisHtml += '<div class="custom-control custom-checkbox">'
        retailCannabisHtml += '<div class="pin" id="' + item.idName + 'Pin"></div>'

        retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input " id="' + item.idName + '" value="' + item.layerNum + '"/>'
        retailCannabisHtml += '<label class="custom-control-label" for="' + item.idName + '">' + item.text + '</label>'
        retailCannabisHtml += '</div>'
      });

      retailCannabisHtml += '<div class="filter-category-name">Other boundaries</div>'
      retailCannabisHtml += '<div class="custom-control custom-checkbox">'
      retailCannabisHtml += '<div class="pin"><img src="images/MCDs.png" width="14" height="14"></div>'

      retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input" id="mcd" value="' + mcdLayerNum + '"/>'
      retailCannabisHtml += '<label class="custom-control-label" for=mcd>&nbsp;&nbsp;Existing MCDs</label>'
      retailCannabisHtml += '</div>'


      retailCannabisHtml += '<div class="custom-control custom-checkbox">'
      retailCannabisHtml += '<div class="pin"><img src="images/school.png" width="19" height="14"></div>'
      // retailCannabisHtml += '<div class="test"><i class="fas fa-graduation-cap"></i></div>'

      retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input" id="schools" value="' + schoolLayerNum + '"/>'
      retailCannabisHtml += '<label class="custom-control-label" for=schools>&nbsp;&nbsp;Schools K-12</label>'

      retailCannabisHtml += '</div>'

      retailCannabisHtml += '<div class="custom-control custom-checkbox">'
      retailCannabisHtml += '<div class="pin" id="super-dist">1</div>'

      retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input" id="super-district" value="' + supervisorDistLayerNum + '"/>'
      retailCannabisHtml += '<label class="custom-control-label" for=super-district>Supervisor Districts (1-11)</label>'
      retailCannabisHtml += '</div>'


      retailCannabisDiv.innerHTML = retailCannabisHtml;
      // checkboxElement.appendChild(retailCannabisDiv);
      // checkboxElement.appendChild(disclaimerDiv);
      // checkboxElement.appendChild(imageDiv)
    }

    function assignLayerNumbersBasedOnNames(mapService) {
      var allLayers = mapService.sublayers.items;
      allLayers.forEach(function (eachLayer) {
        var currLayerId = eachLayer.id;

        switch (eachLayer.title) {
          case 'CannabisLocations_OOC_600ft_Buffer - Approved':
            approvedBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - Under Construction':
            underConstructionBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - Submitted':
            submittedBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - Processing':
            processBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - On Hold':
            onHoldBuffLayerNum = currLayerId;
            break;
          case 'Permitted':
            CANNABIS_PERMITTED_LAYER_NUM = currLayerId;
            break;
          case 'PermittedWithCU':
            CANNABIS_PERMITTED_WITHCU_LAYER_NUM = currLayerId;
            break;
          case 'PermittedWithMicrobusiness':
            CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM = currLayerId;
            break;
          case 'MCDs':
            mcdLayerNum = currLayerId;
            break;
          case 'MCD_600ftBuffer':
            mcdBufferLayerNum = currLayerId;
            break;
          case 'SchoolsPublicPrivateDec2015_KThru12':
            schoolLayerNum = currLayerId;
            break;
          case 'SchoolsPublicPrivateDec2015_600ftBuffer_KThru12':
            schoolBufferLayerNum = currLayerId;
            break;
          case 'Supervisors_2012_Project':
            supervisorDistLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - On Hold':
            onHoldLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Processing':
            processLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Submitted':
            submittedLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Under Construction':
            underConstructionLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Approved':
            approvedLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC':
            cannabisLocationsLayer = currLayerId;
            break;
          case 'Parcel Labels':
            parcelLabelLayerNum = currLayerId;
          default:
            break;
        }
      });
    }

    function addClickedPolygonLayerToMap(geometry, identifyResults) {
      /*
        Add a feature layer to the map based on search results
      */
      map.remove(polygonLayerAddedToMap)

      var features = [identifyResults[0].feature];
      var polygonColoringForInputSearch = {
        type: 'simple-fill',
        color: [146, 148, 150, 0.25],
        style: 'solid',
        outline: {
          color: [7, 40, 250],
          width: 2
        }
      };
      var simpleRenderer = new SimpleRenderer({
        symbol: polygonColoringForInputSearch
      });

      var featureLayerToAddToMap = new FeatureLayer({
        objectIdField: 'ObjectID',
        source: features,
        renderer: simpleRenderer,
        outFields: ["*"],
      });
      polygonLayerAddedToMap = featureLayerToAddToMap;
      map.add(featureLayerToAddToMap)
    }

    function executeIdentifyTask(event) {
      /*
        Runs identify task to see if clicked parcel is a cannabis retail. 
        Also runs a check to see if it is inside a permitted layer
      */
     console.log(mcdLayerNum)
      var identifyTask = new IdentifyTask(CANNABIS_RETAIL_SERVICE_URL);
      var identifyParams = new IdentifyParameters();
      var clickedParcelInsideCannabisRetail = true;
      identifyParams.tolerance = 3;
      identifyParams.returnGeometry = true;
      identifyParams.layerIds = [
        parcelLabelLayerNum,
        mcdLayerNum,

        CANNABIS_PERMITTED_LAYER_NUM,
        CANNABIS_PERMITTED_WITHCU_LAYER_NUM,
        CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM,
      ];
      identifyParams.layerOption = 'top';
      identifyParams.width = view.width;
      identifyParams.height = view.height;
      identifyParams.geometry = event.mapPoint;
      identifyParams.mapExtent = view.extent;

      identifyTask
        .execute(identifyParams)
        .then(function (response) {
          console.log(response)
          var clickedOnParcel = false;
          var searchPopupHtml;
          var permitStatus;
          var resultAttributes;

          var identifyResults = response.results;
          var firstResult = response.results[0];
          var firstResultFeature = firstResult.feature;
          var firstResultAttributes = firstResultFeature.attributes;
          var geometry = firstResultFeature.geometry;

          var NEGATIVE_BUFFER_DISTANCE_IN_FEET = -0.2;
          var tempPolygon = new Polygon(geometry);
          var negativeBufferedGeometry = geometryEngine.geodesicBuffer(tempPolygon, NEGATIVE_BUFFER_DISTANCE_IN_FEET, "feet");

          var mapBlockLotNum = firstResultAttributes.mapblklot;
          if (mapBlockLotNum) {
            clickedOnParcel = true;
          }
          searchParcelIsCannabisPermit(mapBlockLotNum).then(function (response) {
            if (response.features.length !== 0) {
              resultAttributes = response.features[0].attributes;
              permitStatus = resultAttributes.PermitStatus;
            } else {
              clickedParcelInsideCannabisRetail = false;
            }
            console.log('clicked parcel is cannabis: ' + clickedParcelInsideCannabisRetail)
            getInsideWhatZoning(negativeBufferedGeometry).then(function (zoningLayer) {
              console.log('inside zoning: ' + zoningLayer)
              if (zoningLayer !== 'none') {
                if (clickedOnParcel) {
                  if (clickedParcelInsideCannabisRetail) {
                    searchPopupHtml = getSearchPopupHtmlForCannabisPermit(permitStatus, resultAttributes, zoningLayer);
                    view.popup.open({
                      content: searchPopupHtml,
                      location: geometry.extent.center
                    });
                  } else {
                    // parcel not cannabis retail
                    getSearchPopupHtmlNotCannabisPermit(firstResultAttributes, zoningLayer).then(function (popupHtml) {
                      view.popup.open({
                        content: popupHtml,
                        location: geometry.extent.center
                      });
                    })
                  }
                } else {
                  // clicked inside cannabis zoning
                  var popupHtml = getPopupHtmlForInsideCannabisZone(zoningLayer);
                  view.popup.open({
                    content: popupHtml,
                    location: event.mapPoint
                  });
                }
              } else {
                // did not click inside zoning layer but parcel is a cannabis ertail
                if (clickedParcelInsideCannabisRetail) {
                  searchPopupHtml = getSearchPopupHtmlForCannabisPermit(permitStatus, resultAttributes, zoningLayer);
                  view.popup.open({
                    content: searchPopupHtml,
                    location: geometry.extent.center
                  });
                }
              }
            })
          })

          var clickedParcelGeometry = identifyResults[0].feature.geometry;
          addClickedPolygonLayerToMap(clickedParcelGeometry, identifyResults)
        });
    }

    function zoomInToSearchPolygon(geometryToZoomIn) {
      /* 
        zoom in to the geometry passed in to parameter
      */
      view.goTo(
        {
          target: geometryToZoomIn,
          zoom: 17
        },
        {
          duration: 600
        }
      )
    }

    function getPolygonWithinLayerPromise(polygonToCheck, featureLayer) {
      /* 
        return promise that runs a query to check if the polygon is inside the feature layer
      */
      var promise;
      var query = featureLayer.createQuery();
      query.geometry = polygonToCheck;
      query.spatialRelationship = 'intersects';
      promise = featureLayer.queryFeatures(query)
      return promise;
    }

  
    function turnOffSearchLabel(feature) {
      /*
        Get layers that are turned on and run query to see if intersect added search polygon
      */
      var searchPolygon = feature[0].geometry;
      var cannabisPermitCheckboxes = [];
      var cannabisRetailIds = ['submitted', 'onHold', 'processing', 'underConstruction', 'approved'];
      cannabisRetailIds.forEach(function (id) {
        cannabisPermitCheckboxes.push(document.getElementById(id));
      });
      var turnedOnLayers = cannabisPermitCheckboxes.filter(function (input) {
        return input.checked === true;
      });
      var turnedOnLayersId = turnedOnLayers.map(function (eachLayer) {
        return (Number(eachLayer.value))
      })
      for (var i = 0; i < turnedOnLayersId.length; i++) {
        var currLayerUrl = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetailDev/MapServer/' + turnedOnLayersId[i];
        var layerToCheck = new FeatureLayer({
          url: currLayerUrl
        })
        getPolygonWithinLayerPromise(searchPolygon, layerToCheck)
          .then(function (response) {
            if (response.features.length !== 0) {
              polygonLayerAddedToMap.labelsVisible = false;
            }
          })
      }
    }

    function getSearchPopupHtmlForCannabisPermit(permitType, attributes, zoningLayer) {

      var dbaName = attributes.dba_name;
      var address = attributes.address;
      var type = attributes.activities;
  

      // For zoning will have to run query to see which zoning it is in
      var permitTypeMapping = {
        "Submitted": {
          divId: "submitted",
          zoning: ""
        },
        "Processing": {
          divId: "processing"
        },
        "Under Construction": {
          divId: "underConstruction"
        },
        "On Hold": {
          divId: "onHold"
        },
        "Approved": {
          divId: "approved"
        }
      }
      var divId = permitTypeMapping[permitType].divId;

      var popupHtml =
        `
        <div class="cannabis-permit-container">
          <div class="cannabis-permit" id=${divId}>  ${permitType} </div>
        </div>
        <div class="align-left retail-name"> ${dbaName} </div>
        <div class="align-left retail-address"> ${address} </div>
        <table class="status-section" >
          <tr>
            <td class="attribute">Status</td>
            <td class="attribute-detail" style="padding-right: 15px">Referred to Planning Department
          </tr>
          <tr>
            <td class="attribute">Type</td>
            <td class="attribute-detail"> ${type} </td>
          </tr>
        </table>

        `
        
      if (zoningLayer !== 'none') {
        popupHtml += getZoningInformartionForPopup(zoningLayer)
      }
        
      popupHtml += '</div>';
      return popupHtml;
    }

    function getPopupHtmlForInsideCannabisZone(zoning) {

      var popupHtml = getZoningInformartionForPopup(zoning);
      return popupHtml
    }

    function getInputSearchPopupHtmlNotCannabisPermit(address, zoningLayer) {
      var popupHtml =
      `
      <div class="align-left retail-name"> ${address} </div>
      <table class="status-section">
        <tr>
          <td class="attribute">Status</td>
          <td class="attribute-detail">No permits associated with this location
        </tr>
      </table>
      `
      popupHtml += getZoningInformartionForPopup(zoningLayer)
      return popupHtml
    }

    function getZoningInformartionForPopup(zoningName) {
      var zoningImage;
      var dicrentionaryMessage = 'Retail Cannabis: Principally permitted'
      
      switch (zoningName) {
        case 'Allowed with Conditional Use Authorization from SF Planning':
          zoningImage = 'images/legend-conditional-use.png';
          break;
        case 'Allowed':
          zoningImage = 'images/legend-allow.png';
          break;
        case 'Microbusiness permit allowed':
          zoningImage = 'images/legend-microbusiness.png';
          break;
        default:
          break
      }
      var zoningMessage = 
      '<div class="zoning-information" style="margin-top:5px">' + 
      '<div class="cannabis-zoning">'  + 
        '<div ><img  class="cannabis-zoning__image" src="' + zoningImage +  '"></div>' +
      '<div class="cannabis-zoning__text">' + zoningName + '</div>'+
      '</div>' +
      '<div class="disretionary-message">' + dicrentionaryMessage + '</div>'

      return zoningMessage;
    }

    function getSearchPopupHtmlNotCannabisPermit(featureAttributes, zoningLayer) {
      /*
        This function runs when an user clicks on a parcel on the map. It will call the geocoder to get the corresponding address based on the clicked parcel 
      */

      var parcelNum = featureAttributes.mapblklot;
      var geocoderUrlSearch = theProtocol + '://sfplanninggis.org/cpc_geocode/?search=' + parcelNum;

      return $.get(geocoderUrlSearch)
        .then(function (response) {
          var json = JSON.parse(response);
          console.log(json)
          address = json.features[0].attributes.ADDRESS;
          if (!address) {
            address = json.features[0].attributes.blklot
          }

          var popupHtml =
            '<div class="align-left retail-name">' + address + '</div>' +
            '<table class="status-section">' + 
              '<tr>' +
                '<td class="attribute">Status</td>' +
                '<td class="attribute-detail">No permits associated with this location</td>' +
              '</tr>' + 
            '</table>' 

          popupHtml += getZoningInformartionForPopup(zoningLayer)
          return popupHtml;
        })

    }

    function searchParcelIsCannabisPermit(parcelNumString) {
      var promise
      var ALL_CANNABIS_DATA_LAYER_URL = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetail/MapServer/20';
      var queryTask = new QueryTask(ALL_CANNABIS_DATA_LAYER_URL);
      var query = new Query();
      query.where = "parcelToGeocode = '" + parcelNumString + "'"; 0
      query.returnGeometry = true;
      query.outFields = ["*"];
      promise = queryTask.execute(query);
      return promise;
    }

    function getInsideWhatZoning(negativeBufferedGeometry) {
      /*
        This function takes in a negative buffered geometry and checks to see what cannabis zoning it is in. The return type is a string
      */
      return getPolygonWithinLayerPromise(negativeBufferedGeometry, cannabisPermittedWithMicrobusinessLayer)
        .then(function (response) {
          if (response.features.length !== 0) {
            return 'Microbusiness permit allowed';
          } else {
            return getPolygonWithinLayerPromise(negativeBufferedGeometry, cannabisPermittedWithCuLayer)
          }
        })
        .then(function (response) {
          if (!response.features) {
            return response
          } else {
            if (response.features.length !== 0) {
              return 'Allowed with Conditional Use Authorization from SF Planning';
            } else {
              return getPolygonWithinLayerPromise(negativeBufferedGeometry, cannabisPermitedLayer)
            }
          }
        })
        .then(function (response) {
          if (!response.features) {
            return response;
          } else {
            if (response.features.length !== 0) {
              return 'Allowed';
            } else {
              return 'none';
            }
          }
        })
    }
    function isOnMobile() {
      var windowWidth = window.innerWidth;
      return windowWidth < 360 ? true : false;
    }

    function addSearchPolygonToMapHelper(jsonData, searchType, nameOfTobaccoRetail) {
      map.remove(polygonLayerAddedToMap)

      // only grab first item in array to avoid parcels that return multiple results from search
      var featuresFromJsonResponse = [jsonData.features[0]];
      var featureAttributes = jsonData.features[0].attributes;
      var permitStatus = featureAttributes.PermitStatus;
      var parcelIsCannabisPermit = true;
      var zoning;

      // Manually assign geometry type to 'polygon' else will get a error
      featuresFromJsonResponse[0].geometry.type = 'polygon'
      var geometryFromJsonResponse = jsonData.features[0].geometry;
      var correctedFieldsToUse = jsonData.fields;

      if (searchType === 'searchingByGeocoder') {
        correctedFieldsToUse.forEach(function (eachField) {
          eachField.type = 'string';
        });
        var parcelNum = featureAttributes.blklot;

        searchParcelIsCannabisPermit(parcelNum).then(function (response) {
          // console.log(response)
          if (response.features.length !== 0) {
            featureAttributes = response.features[0].attributes;
            permitStatus = featureAttributes.PermitStatus;
          } else {
            parcelIsCannabisPermit = false;
          }
        })
      }

      var polygonColoringForInputSearch = {
        type: 'simple-fill',
        color: [146, 148, 150, 0.25],
        style: 'solid',
        outline: {
          color: [79, 102, 238, 1],
          width: 2
        }
      };


      var polygonRenderer = new SimpleRenderer({
        symbol: polygonColoringForInputSearch
      });
      var NEGATIVE_BUFFER_DISTANCE_IN_FEET = -0.2;
      // Need to create polygon from Polygon class

      var tempPolygonHolder = new Polygon(geometryFromJsonResponse)

      var negativeBufferedGeometry = geometryEngine.geodesicBuffer(tempPolygonHolder, NEGATIVE_BUFFER_DISTANCE_IN_FEET, "feet");
      var tempSearchLayerToAddToMap = new FeatureLayer({
        objectIdField: 'OBJECTID',
        fields: correctedFieldsToUse,
        source: featuresFromJsonResponse,
        renderer: polygonRenderer,
        outFields: ["*"],
        geometryType: 'polygon'
      });
      if (nameOfTobaccoRetail) {
        // assign labeling 
        tempSearchLayerToAddToMap.labelingInfo = [
          {
            symbol: {
              type: "text", // autocasts as new TextSymbol()
              color: "black",
              haloColor: "white",
              haloSize: 1,
              font: {
                family: "Arial",
                size: 8,
              }
            },
            labelPlacement: "always-horizontal",
            labelExpressionInfo: {
              expression: "$feature.dba_name"
            }
          }
        ];
        searchLabelingIsOn = true;
      }

      zoomInToSearchPolygon(tempPolygonHolder);

      getInsideWhatZoning(negativeBufferedGeometry).then(function (insideWhatZoning) {

        if (insideWhatZoning !== 'none') {
          if (parcelIsCannabisPermit) {
            searchPopupHtml = getSearchPopupHtmlForCannabisPermit(permitStatus, featureAttributes, insideWhatZoning);
            view.popup.open({
              content: searchPopupHtml,
              location: tempPolygonHolder.extent.center
            });
          } else {
            var addressFromFeature = featureAttributes.ADDRESS || featureAttributes.ADDRESSSIMPLE;
            var popupHtml = getInputSearchPopupHtmlNotCannabisPermit(addressFromFeature, insideWhatZoning);

            view.popup.open({
              content: popupHtml,
              location: tempPolygonHolder.extent.center
            });
          }
        }
      
        if (isOnMobile()) {
          UICtrl.changeToNewMapHeightMobile()
        }
      });

      polygonLayerAddedToMap = tempSearchLayerToAddToMap;
      turnOffSearchLabel(featuresFromJsonResponse)

      map.add(polygonLayerAddedToMap);
      cancelSpinner()
    }

    return {

      updateLayerVisibility: function (event) {
        /* code goes here */
        var SUPERVISOR_DISTRICT_LAYER_NUM = supervisorDistLayerNum;
        var mapLayerNum = Number(event.target.value);
        var sublayer = mapImageLayer.findSublayerById(parseInt(mapLayerNum));
        var checkBoxChecked = event.target.checked;
        sublayer.visible = !sublayer.visible;

        var currLayerUrl = CANNABIS_RETAIL_SERVICE_URL + '/' + mapLayerNum;
        var clickedLayer = new FeatureLayer({
          url: currLayerUrl
        })
        if (polygonLayerAddedToMap) {
          var geometryFromPolygonLayer = polygonLayerAddedToMap.source.items[0].geometry;
          getPolygonWithinLayerPromise(geometryFromPolygonLayer, clickedLayer)
            .then(function (response) {
              if (response.features.length !== 0) {
                if (checkBoxChecked) {
                  polygonLayerAddedToMap.labelsVisible = false;
                  return polygonLayerAddedToMap.labelsVisible
                } else {
                  polygonLayerAddedToMap.labelsVisible = true;
                  return polygonLayerAddedToMap.labelsVisible
                }
              }
            })
            .then(function (labelIsVisible) {
              console.log("label visible: " + labelIsVisible)
            })

        }

        if (mapLayerNum !== SUPERVISOR_DISTRICT_LAYER_NUM) {
          var bufferLayerNum = mapLayerNum + 1;
          sublayer = mapImageLayer.findSublayerById(parseInt(bufferLayerNum));
          sublayer.visible = !sublayer.visible;
        }


      },
      addSearchPolygonToMap: function (jsonData, searchType, tobaccoName) {
        addSearchPolygonToMapHelper(jsonData, searchType, tobaccoName)
      },
      searchByNameInAttributeTable: function (searchStr, searchAddress, searchType, objectId) {
        var promise;
        var ALL_CANNABIS_DATA_LAYER_URL = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetail/MapServer/20';
        var capitalizeSearchString = searchStr.toUpperCase().trim();
        capitalizeSearchString = capitalizeSearchString.replace("'", "''");

        var queryTask = new QueryTask(ALL_CANNABIS_DATA_LAYER_URL);
        var query = new Query();

        if (searchType === 'findByExactMatch') {
          // query.where = "upper(dba_name) = '" + capitalizeSearchString + "' AND address = '" + searchAddress + "'";
          query.where = "OBJECTID =" + objectId
          
        }
        else {
          query.where = "upper(dba_name) LIKE '%" + capitalizeSearchString + "%'";
        }
        query.returnGeometry = true;
        query.outFields = ["*"];
        promise = queryTask.execute(query);
        promise = queryTask.execute(query);


        return promise;
      },

      searchByAddressInAttributeTable: function (searchStr) {
        var promise;
        /* code goes here */
        var ALL_CANNABIS_DATA_LAYER_URL = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetail/MapServer/20';
        var capitalizeSearchString = searchStr.toUpperCase().trim();
        var itemsToRemoveFromAddress = [', SF', ', SAN FRANCISCO, CA', ', SAN FRANCISCO CA', ' SAN FRANCISCO CA', ', CALIFORNIA',
          ', CA', ',', ' SAN FRANCISCO CA', ' SAN FRANCISCO', ' STREET', ' SF'];

        itemsToRemoveFromAddress.forEach(function (item) {
          capitalizeSearchString = capitalizeSearchString.replace(item, '');
        });
        var queryTask = new QueryTask(ALL_CANNABIS_DATA_LAYER_URL);
        var query = new Query();
        query.where = "upper(address) LIKE '" + capitalizeSearchString + "%'";
        query.returnGeometry = true;
        query.outFields = ["*"];
        promise = queryTask.execute(query);
        return promise;
      }
    }
  }();


  var App = function () {
    var GEOCODER_URL = theProtocol + '://sfplanninggis.org/cpc_geocode/?search=';

    function showPopupChoices(searchResponse) {
      var modalHtml = '';
      var featureNum = searchResponse.features.length;
      var multipleResultTitleStr = 'Multiple Results - Please select one';
      console.log(searchResponse)
      for (var i = 0; i < featureNum; i++) {
        var currCannabisBusinessName = searchResponse.features[i].attributes.dba_name;
        var currCannabisAddressString = searchResponse.features[i].attributes.address;
        var cannabisId = searchResponse.features[i].attributes.OBJECTID;
        modalHtml += "<div id='" +cannabisId + "'class='messi-button-container'><button class='btn btn-sm multiple-business-selection'>" + currCannabisBusinessName + ':<br>' + currCannabisAddressString + "</button></div>"
      }
      UICtrl.displayModal(multipleResultTitleStr, modalHtml);
    }

    function getGeocoderResponse(geocoderUrl, searchVal) {
      return $.get(geocoderUrl)
        .then(function (response) {
          return JSON.parse(response)
        })
    }

    function isNumeric(sText) {
      var validChars = "-0123456789.";
      var isNumber = true;
      var char;
      for (i = 0; i < sText.length && isNumber == true; i++) {
        char = sText.charAt(i);
        if (validChars.indexOf(char) == -1) {
          isNumber = false;
        }
      }
      return isNumber;
    }

    function performSearches(searchStr) {
      var geocoderWithSearchValUrl = GEOCODER_URL + searchStr;
      getGeocoderResponse(geocoderWithSearchValUrl).then(function (jsonResponse) {
        var responseFeatures = jsonResponse.features;
        var responseFeaturesLength = responseFeatures.length;
        if (responseFeaturesLength > 0) {
          jsonResponse.type = 'polygon';
          if (jsonResponse['error']) {
            return
          } else {
            MapCtrl.addSearchPolygonToMap(jsonResponse, 'searchingByGeocoder');
          }
        } else {
          // search by address 
          MapCtrl.searchByAddressInAttributeTable(searchStr)
            .then(function (response) {
              var numOfFeatures = response.features.length;
              if (numOfFeatures > 0) {
                if (numOfFeatures > 1) {
                  showPopupChoices(response)
                } else if (numOfFeatures === 1) {
                  var cannabisRetailName = response.features[0].attributes.dba_name;
                  MapCtrl.addSearchPolygonToMap(response, 'searchingByAttributeTable', cannabisRetailName);
                }
              } else {
                MapCtrl.searchByNameInAttributeTable(searchStr)
                  .then(function (response) {
                    var numOfFeatures = response.features.length;
                    if (numOfFeatures > 1) {
                      showPopupChoices(response);
                    }
                    else if (numOfFeatures === 1) {
                      var cannabisRetailName = response.features[0].attributes.dba_name;
                      MapCtrl.addSearchPolygonToMap(response, 'searchingByAttributeTable', cannabisRetailName);
                    } else {
                      cancelSpinner()
                      var bodyDisplayStr = 'Please try again';
                      var titleDisplayStr = 'No Results For ' + searchStr;
                      UICtrl.displayModal(titleDisplayStr, bodyDisplayStr);
                    }
                  })
                  .catch(function (err) {
                    alert('An unknown error has occured. Please try again later');
                  });
              }
            })
        }
      })
    }

    // function isSmallView() {
    //   var windowWidth = window.innerWidth;
    //   console.log(windowWidth)
    //   return windowWidth < 992 ?  true : false;
    // }

    function listenForEvents() {
      var uiSelectors = UICtrl.getUiSelectors();

      // submit search box
      $(uiSelectors.searchBox).submit(function (event) {
        console.log('submitting')
        callLoadSpinner()
        event.preventDefault();
        var searchString = $('#addressInput').val();
        performSearches(searchString);
        // if (isOnMobile) {
        //   UICtrl.changeToNewMapHeightMobile();
        // }
        // UICtrl.hideMobileMenu();
        // UICtrl.changeToNewMapHeight();
      });

      // clicking on legend tab in mobile view
      $(uiSelectors.legendTab).click(function() {
        
        UICtrl.highLightClickedTab(event.target); 
        UICtrl.showLegendOnMobileTab();
        // UICtrl.changeToNewMapHeight();
      })

      // clicking on location tab in mobile view
      $(uiSelectors.locationTab).click(function() {
        UICtrl.highLightClickedTab(event.target); 
        UICtrl.showFilterOnMobileTab();
        // UICtrl.changeToNewMapHeight();
      })

      document.addEventListener('click', function (event) {
        var MULTIPLE_BUSINESS_SELECTION_CLASS = 'multiple-business-selection';

        var clickedType = event.target.type;

        var currClassName = event.target.className;

        var clickedItemTextContent = event.target.textContent;
        var clickedBusinessName = clickedItemTextContent.split(':')[0];
        var clickedBusinessAddress = clickedItemTextContent.split(':')[1];
        var parentElement = event.target.parentElement;
        var parentElementClassName = parentElement.className;

        // User has selected on a choice at this point
        if ((currClassName.indexOf(MULTIPLE_BUSINESS_SELECTION_CLASS) !== -1) && (parentElementClassName === 'messi-button-container')) {
          var currIDName = parentElement.id;
          var searchType = 'findByExactMatch'
          MapCtrl.searchByNameInAttributeTable(clickedBusinessName, clickedBusinessAddress, searchType, currIDName)
            .then(function (response) {
              console.log(response)
              var nameOfTobaccoRetail = response.features[0].attributes.dba_name;
              var numOfFeatures = response.features.length;
              console.log(numOfFeatures)
              if (numOfFeatures === 1) {
                
                MapCtrl.addSearchPolygonToMap(response, 'searchingByAttributeTable', nameOfTobaccoRetail);
              }
              document.querySelector('.close').click();
            })
        }

        // cancel spinner when closing messi diablog
        if (currClassName === 'messi-closebtn') {
          cancelSpinner()
        }


        if (currClassName === 'close' || parentElementClassName === 'close') {
          var popup = document.querySelector('.modal-content');
          if (popup) {
            cancelSpinner();
          }
        }

        // turn layers on/off
        if (clickedType === 'checkbox') {
          MapCtrl.updateLayerVisibility(event)
        }
      })

    }

    return {
      init: function () {
        $(document).ready(function () {
          listenForEvents();
          // if (isSmallView()) {
          //   UICtrl.changeToNewMapHeight();
          // }
          UICtrl.listenForScrollingForLocationMenu();
          UICtrl.listenForMobileAlert();

        })
      }
    }
  }();


  App.init();


});







function callLoadSpinner() {
  $('#spinnerLargeMap').show();
  $('#map').addClass('disabledDIV');
}

function cancelSpinner() {
  $('#spinnerLargeMap').hide();
  $('#map').removeClass('disabledDIV');
}




