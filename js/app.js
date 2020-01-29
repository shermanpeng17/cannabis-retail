var theProtocol;

if (window.location.protocol == "https:") {
  theProtocol = "https";
} else {
  theProtocol = "http";
}

require(["esri/Map", "esri/views/MapView", "esri/geometry/support/meshUtils", "esri/geometry/Mesh", "esri/Graphic", "esri/tasks/support/BufferParameters", "esri/tasks/GeometryService", "esri/geometry/geometryEngine", "esri/geometry/SpatialReference", "esri/layers/FeatureLayer", "esri/layers/MapImageLayer", "esri/widgets/BasemapToggle", "esri/renderers/SimpleRenderer", "esri/tasks/IdentifyTask", "esri/tasks/support/IdentifyParameters", "esri/geometry/geometryEngine", "esri/geometry/Polygon", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/renderers/SimpleRenderer"], function (Map, MapView, meshUtils, Mesh, Graphic, BufferParameters, GeometryService, geometryEngine, SpatialReference, FeatureLayer, MapImageLayer, BasemapToggle, SimpleRenderer, IdentifyTask, IdentifyParameters, geometryEngine, Polygon, QueryTask, Query, SimpleRenderer) {

  var SearchCtrl = function () {
    var GEOCODER_URL = theProtocol + '://sfplanninggis.org/cpc_geocode/?search=';
    var mapServiceUrl = 'https://sfplanninggis.org/arcgiswa/rest/services/CannabisRetail/MapServer/'
    return {
      getGeocoderResponse: function (searchString) {
        var geocodeUrl = GEOCODER_URL + searchString;
        return $.get(geocodeUrl)
          .then(function (response) {
            return response;
          });
      },

      getSearchByAddressResponsePromise: function (searchString) {
        var capitalizeSearchString = searchString.toUpperCase().trim();
        var layerNumMappings = MapCtrl.getLayerNumMapping();
        var cannabisLayerNum = layerNumMappings.cannabisLocationsLayer;
        var queryPromise;

        var cannabisLayerMapService = mapServiceUrl + cannabisLayerNum;

        var itemsToRemoveFromAddress = [', SF', ', SAN FRANCISCO, CA', ', SAN FRANCISCO CA', ' SAN FRANCISCO CA', ', CALIFORNIA',
          ', CA', ',', ' SAN FRANCISCO CA', ' SAN FRANCISCO', ' STREET', ' SF'];

        itemsToRemoveFromAddress.forEach(function (item) {
          capitalizeSearchString = capitalizeSearchString.replace(item, '');
        });

        var queryTask = new QueryTask(cannabisLayerMapService);
        var query = new Query();
        query.where = "upper(address) LIKE '" + capitalizeSearchString + "%'";
        query.returnGeometry = true;
        query.outFields = ["*"];
        queryPromise = queryTask.execute(query);
        return queryPromise;
      },

      getSearchByStoreNameResponsePromise: function (searchString, searchAddress, searchType, objectId) {
        var promise;
        var layerNumMappings = MapCtrl.getLayerNumMapping();
        var cannabisLayerNum = layerNumMappings.cannabisLocationsLayer;
        var capitalizeSearchString = searchString.toUpperCase().trim();
        capitalizeSearchString = capitalizeSearchString.replace("'", "''");
        var cannabisLayerMapService = mapServiceUrl + cannabisLayerNum;
        var queryTask = new QueryTask(cannabisLayerMapService);
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
        return promise;
      },

      checkIfParcelIsMcd: function (parcelStr) {
        var promise;
        var layerNumMappings = MapCtrl.getLayerNumMapping();
        var mcdLayerNum = layerNumMappings.mcdLayerNum;
        var mcdLayerMapService = mapServiceUrl + mcdLayerNum;
        var queryTask = new QueryTask(mcdLayerMapService);
        var query = new Query();

        query.where = "mapblklot = '" + parcelStr + "'";
        query.returnGeometry = true;
        query.outFields = ["*"];
        promise = queryTask.execute(query);
        return promise;
      },

      searchParcelIsCannabisPermit: function (parcelNumString) {
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
    }
  }();

  var UICtrl = function () {
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
      modalHeader: '.modal-header',
      mobileFilterContainer: '#filter-container',
      mobileFilterElements: '#filter-elements',
      mobileSelectedTab: '#mobile-selected-tab',
      legendTab: '#legend-tab',
      locationTab: '#location-tab',
      alertMobile: '#alert',
      esriBasemapToggle: '.esri-basemap-toggle',
      esriBasemapThumbnailImage: '.esri-basemap-thumbnail__image',
      tabsContainer: '.tab-container',
      mapContainer: '.map-container',
      contentContainer: '.content-container',
      esriPopupContainer: '.esri-popup__main-container',
      closeModal: '.close',
      zoningDescription: '.zoning-description',

      popupBottomPointerArrow: '.esri-popup__pointer-direction',
      neighborhoodList: '#neighborhood-list'
    }

    var cannabisOnHoldPermitName = 'CannabisLocations_OOC - On Hold';
    var cannabisProcessingPermitName = 'CannabisLocations_OOC - Processing';
    var cannabisSubmittedPermitName = 'CannabisRetailDev - CannabisLocations OOC - Submitted';
    var cannabisApprovedPermitName = 'CannabisLocations_OOC - Approved';
    var cannabisUnderConstructionPermitName = 'CannabisLocations_OOC - Under Construction';
    var mcdName = 'CannabisRetailDev - MCDs';
    var schoolName = 'SchoolsPublicPrivateDec2015_KThru12';

    var initialLegendTabHeight = $(uiSelectors.tabDisplayContainer).height();

    function getIconBasedOnLayerName(layerName, feature) {
      // console.log('layer name : ' + layerName)
      var layerInfo = {};
      layerInfo.address = feature.attributes.address;
      layerInfo.name = feature.attributes.dba || feature.attributes.dba_name;
      switch (layerName) {
        case cannabisOnHoldPermitName:
          layerInfo.icon = 'images/On-Hold-pin.svg';
          layerInfo.layerName = 'cannabisPermitOnHold';
          break;
        case cannabisProcessingPermitName:
          layerInfo.icon ='images/Processing-pin.svg';
          layerInfo.layerName = 'cannabisPermitProcessing';
          break;
        case cannabisSubmittedPermitName:
          layerInfo.icon = 'images/Submitted-pin.svg';
          layerInfo.layerName = 'cannabisPermitSubmitted';
          break;
        case cannabisApprovedPermitName:
          layerInfo.icon ='images/Approved-pin.svg';
          layerInfo.layerName = 'cannabisPermitsApproved';
          break;
        case cannabisUnderConstructionPermitName:
          layerInfo.icon ='images/Under-construction-pin.svg';
          layerInfo.layerName = 'cannabisPermitsConstruction';
          break;
        case mcdName:
          layerInfo.icon ='images/MCDs.svg';
          layerInfo.layerName = 'mcds';
          break;
        case schoolName:
          layerInfo.icon ='images/school.svg';
          layerInfo.layerName = 'schools'
          break;
        default:
          break;  
      }
      layerInfo.id = feature.attributes.OBJECTID;
      return layerInfo
    }

    return {
      getUiSelectors: function () {
        return uiSelectors;
      },

      hideMobileMenu: function () {
        $(uiSelectors.filterContainer).css('display', 'none');
        $(uiSelectors.mobileLegend).css('display', 'none');
        $(uiSelectors.tabDisplayContainer).css('display', 'none');
      },

      displayModal: function (titleStr, bodyStr) {
        $(uiSelectors.modalBody).html(bodyStr);
        $(uiSelectors.modalTitle).html(titleStr);
        $(uiSelectors.modalDisplay).modal('show');
      },

      changePopupFooterColor: function () {
        var grayFooterColorHex = '#f8f8f8';
        $('.esri-popup__pointer-direction').css('background', grayFooterColorHex);
        $('.esri-popup__navigation').css('cssText', 'background: #f8f8f8 !important');
        $('.esri-popup__footer').css('background', grayFooterColorHex);
      },

      showNearByLocationOnPopup: function() {
        var currPopupLocation = MapCtrl.getCurrPopupLocation();
        var listOfItemsInsideSearchBuffer = MapCtrl.getListOfItemsInsideParcelBuffer();
        var view = MapCtrl.getView();
        var multipleLocationPopupHtml = '';
        var isOnMultipleLocationView = PopupCtrl.getIsOnMultipleView();


        if (isOnMultipleLocationView) {
          var popup = document.querySelector('.esri-popup__content');
          popup.classList.add('no-margin-popup')
          $('.esri-popup__content').addClass('no-margin-popup');
        }
        multipleLocationPopupHtml += '<table class="multiple-locations-inside-buffer">' + 
        '<tr><td colspan="2">Locations might be within 600 feet of "test"</td></tr>'
        listOfItemsInsideSearchBuffer.forEach(function(eachItem) {
          var features = eachItem.features;
          features.forEach(function(eachFeature) {
            var currFeatureLayerTitle = eachFeature.sourceLayer.title;
            var locationIconAndInfo = getIconBasedOnLayerName(currFeatureLayerTitle, eachFeature);
            multipleLocationPopupHtml += '<tr>'
            multipleLocationPopupHtml += 
              '<td class="multiple-location-td__image"><img class="multiple-location__icon" src="' + locationIconAndInfo.icon + '">' + 
              '<td class="multiple-location-td"><p class="multiple-location-td__info" id="' + locationIconAndInfo.id + '"title=' + locationIconAndInfo.layerName + '>' + locationIconAndInfo.address + '</p><p class="multiple-location-td__info">' + locationIconAndInfo.name + '</p></td>'
            multipleLocationPopupHtml += '</tr>'
          });
        })
        multipleLocationPopupHtml += '</table>';
        view.popup.open({
          location: currPopupLocation,
          content: multipleLocationPopupHtml
        })
      },

      listenForMobileAlert: function () {
        $(uiSelectors.alertMobile).click(function () {
          var disclaimerMessage = '<div id="alert-message-mobile">Map Layers include 600 ft buffers aroud the property. Use this map only as an estimate <br><br> <a href="https://sfplanning.org/location-and-hours" class="contact-planning">Contact SF Planning</a> to confirm eligibility of a location</div>';
          $(uiSelectors.modalHeader).css('background', 'white');
          $(uiSelectors.modalHeader).css('border-bottom', 'none')
          $(uiSelectors.closeModal).css('color', '#1C3E57');

          $(uiSelectors.modalBody).html(disclaimerMessage);
          $(uiSelectors.modalTitle).html('');
          $(uiSelectors.modalDisplay).modal('show');
        });
      },

      resetMobileTabLogosToDefault: function () {
        $('#locations-logo').attr('src', 'images/Location.svg')
        $('#legend-logo').attr('src', 'images/legend.svg');
      },

      /*
        adds box shadow if there is scrolling
      */
      listenForLegendAccordionToggle: function () {
        $(uiSelectors.zoningDescription)
          .on('shown.bs.collapse', function () {
            var legendTabHeight = $('#mobile-selected-tab').height();
            if (legendTabHeight > initialLegendTabHeight) {
              $(uiSelectors.tabDisplayContainer).css('box-shadow', 'inset 0px -40px 41px -44px rgba(0,0,0,0.2)')
            }
          })
          .on('hidden.bs.collapse', function () {

            var legendTabHeight = $('#mobile-selected-tab').height();
            if (legendTabHeight <= initialLegendTabHeight) {
              $(uiSelectors.tabDisplayContainer).css('box-shadow', 'inset 0px -40px 41px -44px rgba(0,0,0,0)')
            }
          })
      },

      /*
        Add box shadow to the location menu tab on mobile. 
          - box shadow will dissapear when at bottom of scroll
          - box shadow will reappear when there is scroll
      */
      listenForScrollingForLocationMenu: function () {
        $(uiSelectors.mobileFilterContainer).scroll(function () {
          if (Math.ceil($(this).scrollTop()) + Math.ceil($(uiSelectors.mobileFilterContainer).height()) === this.scrollHeight) {
            // at bottom of scroll
            // $(this).css('box-shadow', 'inset 0px 40px 41px -44px rgba(0,0,0,0.75)')
            $(this).css('box-shadow', 'inset 0px 40px 41px -44px rgba(0,0,0,0)')

          } else if ($(this).scrollTop() + $(this).height() === $(uiSelectors.mobileFilterContainer).height()) {
            // at top of scroll
            $(this).css('box-shadow', 'inset 0px -40px 41px -44px rgba(0,0,0,0.2)')

          } else if (Math.ceil($(this).scrollTop()) + Math.ceil($(uiSelectors.mobileFilterContainer).height()) < this.scrollHeight) {
            // at between top and bottom scroll
            // $(this).css('box-shadow', 'inset 0px 40px 41px -44px rgba(0,0,0,0.75), inset 0px -40px 41px -44px rgba(0,0,0,0.75)')
            $(this).css('box-shadow', 'inset 0px -40px 41px -44px rgba(0,0,0,0.2)')

          }
        });
      },

      displayMobileDisclaimer: function () {
        var disclaimerMessage = 'Map Layers include 600 ft buffers aroud the property. Use this map only as an estimate <br><br> Contact SF Planning to confirm eligibility of a location';
        this.displayModal('', disclaimerMessage)
      },

      highLightClickedTab: function (clickedElement) {
        var tmpClickElement = clickedElement;
        var clickedElementClassName = tmpClickElement.className;

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

      changeMobileTabsToNonActiveColors: function () {
        var legendTabs = document.getElementsByClassName('legend-element');
        var legendArr = Array.from(legendTabs);
        legendArr.forEach(function (legend) {
          legend.classList.remove('selected');
        });
        $('#legend-logo').attr('src', 'images/legend.svg');
        $('#locations-logo').attr('src', 'images/Location.svg');

      },

      changeMapHeightAndHandleTabDisplay: function (popupIsVisible) {
        var contentContainerHeight = $(uiSelectors.contentContainer).height();
        var tabHeightsAtBottomOfScreen = 60;

        if (popupIsVisible) {
          var popupHeight = $(uiSelectors.esriPopupContainer).height();
          var newMapHeight = contentContainerHeight - popupHeight - tabHeightsAtBottomOfScreen;
        } else {
          var newMapHeight = contentContainerHeight - tabHeightsAtBottomOfScreen;
        }

        $(uiSelectors.tabDisplayContainer).css('display', 'none');
        var tabDisplayContainerChildren = $(uiSelectors.tabsContainer).children();
        for (var i = 0; i < tabDisplayContainerChildren.length; i++) {
          tabDisplayContainerChildren[i].classList.remove('selected');
        }
        $(uiSelectors.mapContainer).css('height', newMapHeight.toString());
      },

      changePopFooterForMobile: function () {
        var esriPopupFooter = $('.esri-popup__footer--has-actions');
        esriPopupFooter.css({
          'position': 'absolute',
          'width': '100%',
          'top': '-23px',
          'border-bottom-right-radius': '0px',
          'border-bottom-left-radius': '0px'
        })
      },

      changeToNewMapHeight: function () {
        var mobileMenuHeight = $('.menu-mobile').height();
        var contentContainerHeight = $('.content-container').height();
        var newMapHeight = contentContainerHeight - mobileMenuHeight;
        $('.map-container').css('height', newMapHeight.toString());
      },

      showLegendOnMobileTab: function (clickedElement) {
        $(uiSelectors.mobileLegend).css('display', 'block');
        $(uiSelectors.filterContainer).css('display', 'none');

      },

      showFilterOnMobileTab: function (clickedElement) {
        $(uiSelectors.mobileLegend).css('display', 'none');
        $(uiSelectors.filterContainer).css('display', 'block');
      },
    }
  }();

  var PopupCtrl = function() {
    var isOnMultipleLocationView = false;

    return {
      getIsOnMultipleView: function() {
        return isOnMultipleLocationView;
      },

      setIsOnMultipleView: function(bool) {
        isOnMultipleLocationView = bool;
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
    var popupItemsArr;
    var listOfItemsInsideSearchBuffer;
    var currPopupLocation;
    

    var cannabisRetailLayerMapToNumber = {
      approvedBuffLayerNum: '',
      underConstructionBuffLayerNum: '',
      submittedBuffLayerNum: '',
      processBuffLayerNum: '',
      onHoldBuffLayerNum: '',
      CANNABIS_PERMITTED_LAYER_NUM: '',
      CANNABIS_PERMITTED_WITHCU_LAYER_NUM: '',
      CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM: '',
      mcdLayerNum: '',
      mcdBufferLayerNum: '',
      schoolLayerNum: '',
      schoolBufferLayerNum: '',
      supervisorDistLayerNum: '',
      onHoldLayerNum: '',
      processLayerNum: '',
      submittedLayerNum: '',
      underConstructionLayerNum: '',
      approvedLayerNum: '',
      cannabisLocationsLayer: '',
      parcelLabelLayerNum: '',
      neighborhoodLayerNum: ''
    }

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

    var polygonColoringForInputSearch = {
      type: 'simple-fill',
      color: [146, 148, 150, 1],
      style: 'solid',
      outline: {
        color: [79, 102, 238, 1],
        width: 2
      }
    };

    var labelingSetupInfo = [
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

    var polygonRenderer = new SimpleRenderer({
      symbol: polygonColoringForInputSearch
    });

    map = new Map({
      basemap: 'gray-vector'
    });

    view = new MapView({
      container: 'map',
      map: map,
      center: [-122.45, 37.76],
      zoom: 12,
    });

    map.basemap.thumbnailUrl = 'images/Globe-bkg.svg'

    mapImageLayer = new MapImageLayer({
      url: CANNABIS_RETAIL_SERVICE_URL,
    });

    var basemapToggle = new BasemapToggle({
      view: view,
      nextBasemap: "hybrid"
    });

    view.when(function () {
      view.on('click', executeIdentifyTask);
      view.watch("popup.visible", function (newVal, oldVal) {
        if (popupItemsArr && popupItemsArr.length > 1) {
          UICtrl.changePopupFooterColor();
        }
        // view.popup.currentDockPosition = "top-left"
        if (newVal === true) {
          if (App.isOnMobile()) {
            UICtrl.changeMapHeightAndHandleTabDisplay(newVal);
            UICtrl.changePopFooterForMobile();
            UICtrl.changeMobileTabsToNonActiveColors();
          }
        }
        view.popup.collapsed = false;
      })
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
      ];

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

      cannabisPermitedLayer = new FeatureLayer({
        url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_LAYER_NUM
      });


      cannabisPermittedWithCuLayer = new FeatureLayer({
        url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITHCU_LAYER_NUM
      });

      cannabisPermittedWithMicrobusinessLayer = new FeatureLayer({
        url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM
      });
    });

    map.add(mapImageLayer);

    function createElementWithClassName(elementType, className) {
      var element = document.createElement(elementType);
      element.setAttribute('class', className);
      return element;
    }

    function populateCheckboxes() {
      var retailPermitsLayerArr = [
        { idName: 'submitted', layerNum: supervisorDistLayerNum.submittedLayerNum, text: 'Submitted' },
        { idName: 'processing', layerNum: supervisorDistLayerNum.processLayerNum, text: 'Processing' },
        { idName: 'underConstruction', layerNum: supervisorDistLayerNum.underConstructionLayerNum, text: 'Under Construction' },
        { idName: 'onHold', layerNum: supervisorDistLayerNum.onHoldLayerNum, text: 'On Hold' },
        { idName: 'approved', layerNum: supervisorDistLayerNum.approvedLayerNum, text: 'Approved' }
      ]

      var checkboxElement = document.getElementById('filter-container');
      var retailCannabisDiv = createElementWithClassName('div', 'retail-cannabis-checkbox');
      var retailCannabisHtml = '';
      var disclaimerDiv = createElementWithClassName('div', 'disclaimer');
      var imageDiv = createElementWithClassName('div', 'image-container');

      var legendImage = new Image();

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

      retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input" id="mcd" value="' + cannabisRetailLayerMapToNumber.mcdLayerNum + '"/>'
      retailCannabisHtml += '<label class="custom-control-label" for=mcd>&nbsp;&nbsp;Existing MCDs</label>'
      retailCannabisHtml += '</div>'


      retailCannabisHtml += '<div class="custom-control custom-checkbox">'
      retailCannabisHtml += '<div class="pin"><img src="images/school.png" width="19" height="14"></div>'
      // retailCannabisHtml += '<div class="test"><i class="fas fa-graduation-cap"></i></div>'

      retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input" id="schools" value="' + cannabisRetailLayerMapToNumber.schoolLayerNum + '"/>'
      retailCannabisHtml += '<label class="custom-control-label" for=schools>&nbsp;&nbsp;Schools K-12</label>'

      retailCannabisHtml += '</div>'

      retailCannabisHtml += '<div class="custom-control custom-checkbox">'
      retailCannabisHtml += '<div class="pin" id="super-dist">1</div>'

      retailCannabisHtml += '<input type="checkbox" class="list_item custom-control-input" id="super-district" value="' + cannabisRetailLayerMapToNumber.supervisorDistLayerNum + '"/>'
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
            cannabisRetailLayerMapToNumber.approvedBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - Under Construction':
            cannabisRetailLayerMapToNumber.underConstructionBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - Submitted':
            cannabisRetailLayerMapToNumber.submittedBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - Processing':
            cannabisRetailLayerMapToNumber.processBuffLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC_600ft_Buffer - On Hold':
            cannabisRetailLayerMapToNumber.onHoldBuffLayerNum = currLayerId;
            break;
          case 'Permitted':
            cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_LAYER_NUM = currLayerId;
            break;
          case 'PermittedWithCU':
            cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITHCU_LAYER_NUM = currLayerId;
            break;
          case 'PermittedWithMicrobusiness':
            cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM = currLayerId;
            break;
          case 'MCDs':
            cannabisRetailLayerMapToNumber.mcdLayerNum = currLayerId;
            break;
          case 'MCD_600ftBuffer':
            cannabisRetailLayerMapToNumber.mcdBufferLayerNum = currLayerId;
            break;
          case 'SchoolsPublicPrivateDec2015_KThru12':
            cannabisRetailLayerMapToNumber.schoolLayerNum = currLayerId;
            break;
          case 'SchoolsPublicPrivateDec2015_600ftBuffer_KThru12':
            cannabisRetailLayerMapToNumber.schoolBufferLayerNum = currLayerId;
            break;
          case 'Supervisors_2012_Project':
            cannabisRetailLayerMapToNumber.supervisorDistLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - On Hold':
            cannabisRetailLayerMapToNumber.onHoldLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Processing':
            cannabisRetailLayerMapToNumber.processLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Submitted':
            cannabisRetailLayerMapToNumber.submittedLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Under Construction':
            cannabisRetailLayerMapToNumber.underConstructionLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC - Approved':
            cannabisRetailLayerMapToNumber.approvedLayerNum = currLayerId;
            break;
          case 'CannabisLocations_OOC':
            cannabisRetailLayerMapToNumber.cannabisLocationsLayer = currLayerId;
            break;
          case 'Parcel Labels':
            cannabisRetailLayerMapToNumber.parcelLabelLayerNum = currLayerId;
            break;
          case 'Neighborhoods_Project':
            cannabisRetailLayerMapToNumber.neighborhoodLayerNum = currLayerId;
            break;
          default:
            break;
        }
      });
    }
    

    /*
      Add a feature layer to the map based on search results
    */
    function addPolygonToMap(identifyResults, polygonColor, centerOfPolygonColor) {
      console.log(view)
      var geometry = identifyResults.geometry;
      var centerOfPolygon = {
        type: 'point',
        longitude: geometry.extent.center.longitude,
        latitude: geometry.extent.center.latitude
      }
      var polygonGraphic = new Graphic({
        geometry: geometry,
        symbol: polygonColor
      });
      var pointGraphic = new Graphic({
        geometry: centerOfPolygon,
        symbol: centerOfPolygonColor  
      });
      console.log(polygonGraphic)
      view.graphics.add(polygonGraphic);
      view.graphics.add(pointGraphic);
      console.log(view)
    }

    function isLayerTurnedOn(layerName) {
      var layerToCheck = mapImageLayer.allSublayers.items.filter(function (layer) {
        return layer.title === layerName
      });
      return layerToCheck[0].visible;
    }

    /*
      This function returns a buffer promise
    */
    function getBufferGeometry(geometryToBuffer) {
      var geometryService = new GeometryService({
        url: "https://sfplanninggis.org/arcgiswa/rest/services/Utilities/Geometry/GeometryServer"
      });
      var tmp = new Polygon(geometryToBuffer)

      var bufferParams = new BufferParameters({
        distances: [761.4],
        unit: 'feet',
        geodesic: false,
        bufferSpatialReference: new SpatialReference({ wkid: 3857 }),
        outSpatialReference: view.spatialReference,
        geometries: [tmp]
      });
      return geometryService.buffer(bufferParams);
    }

    function addBufferAroundSearchPolygonHelper(geometry) {
      console.log(geometry);
      view.graphics.items = [];
      var geometryService = new GeometryService({
        url: "https://sfplanninggis.org/arcgiswa/rest/services/Utilities/Geometry/GeometryServer"
      })

      var tmp = new Polygon(geometry)

      var bufferParams = new BufferParameters({
        distances: [761.4],
        unit: 'feet',
        geodesic: false,
        bufferSpatialReference: new SpatialReference({ wkid: 3857 }),
        outSpatialReference: view.spatialReference,
        geometries: [tmp]
      });
      geometryService.buffer(bufferParams)
        .then(function (results) {
          // var centerOfPolygon = results[0].extent.center;
          var centerOfPolygon = {
            type: 'point',
            longitude: results[0].extent.center.longitude,
            latitude: results[0].extent.center.latitude
          }
          view.graphics.add(new Graphic({
            geometry: results[0],
            symbol: {
              type: 'simple-fill',
              color: [146, 148, 150, 0.25],
              style: 'solid',
              outline: {
                color: [79, 102, 238, 1],
                width: 2
              }
            }
          }));
          // view.graphics.add(new Graphic({
          //   geometry: centerOfPolygon,
          //   symbol: {
          //     type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
          //     color: [79, 102, 238, 1],
          //     outline: {
          //       color: [79, 102, 238, 1],
          //       width: 2
          //     }
          //   }
          // }))
        })
        .catch(function (err) {
          console.log(err)
        })
    }

    /*
      Runs identify task to see if clicked parcel is a cannabis retail. 
      Also runs a check to see if it is inside a permitted layer
    */
    function executeIdentifyTask(event) {
      var identifyTask = new IdentifyTask(CANNABIS_RETAIL_SERVICE_URL);
      var identifyParams = new IdentifyParameters();

      var parcelNum;
      var insideZoning = 'none';
      var bufferGeomtry;
      var parcelGeomtry;
      identifyParams.tolerance = 0;
      identifyParams.returnGeometry = true;
      identifyParams.layerIds = [
        cannabisRetailLayerMapToNumber.parcelLabelLayerNum,

        cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_LAYER_NUM,
        cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITHCU_LAYER_NUM,
        cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM,

        cannabisRetailLayerMapToNumber.mcdLayerNum,

        cannabisRetailLayerMapToNumber.cannabisLocationsLayer,
      ];
      identifyParams.layerOption = 'all';
      identifyParams.width = view.width;
      identifyParams.height = view.height;
      identifyParams.geometry = event.mapPoint;
      identifyParams.mapExtent = view.extent;

      PopupCtrl.setIsOnMultipleView(false);


      // logic = check first item layer name. then use name to see if layer is turned on, if turned on then display mcd popup. else if layer not turned on then use next item in array and then identify 
      identifyTask
        .execute(identifyParams)
        .then(function (response) {
          map.remove(polygonLayerAddedToMap)
          var results = response.results
          return results.map(function (result) {
            console.log(result)
            var feature = result.feature;
            var layerName = result.layerName;
            var featureAttributes = feature.attributes;
            // var geometry = feature.geometry;

            if (layerName === 'Permitted') {
              insideZoning = 'Allowed';
              feature.isZoning = true;
            } else if (layerName === 'PermittedWithCU') {
              insideZoning = 'Allowed with Conditional Use Authorization from SF Planning';
              feature.isZoning = true;
            } else if (layerName === 'PermittedWithMicrobusiness') {
              insideZoning = 'Microbusiness permit allowed';
              feature.isZoning = true;
            } else if (layerName === 'MCDs') {
              var mcdTradeName = result.feature.attributes.DBA;
              var isMcd = true;
              var isCannabisPermit = false;
              var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, featureAttributes, insideZoning);
              feature.popupTemplate = {
                title: mcdTradeName,
                content: popupHtml
              }
              feature.isMCD = true;
            } else if (layerName === 'CannabisLocations_OOC') {
              var cannabisTradeName = result.feature.attributes.dba_name;
              var isMcd = false;
              var isCannabisPermit = true;
              var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, featureAttributes, insideZoning);
              feature.popupTemplate = {
                title: cannabisTradeName,
                content: popupHtml
              }
              feature.isCannabisPermit = true;
            } else if (layerName === 'Parcel Labels') {
              var isMcd = false;
              var isCannabisPermit = false;
              parcelNum = featureAttributes.mapblklot;
              parcelAttributes = featureAttributes;
              parcelGeomtry = feature.geometry;
              var polygonToAddToMap = new Polygon(feature.geometry);
              var layerToAddToMap = new FeatureLayer({
                objectIdField: "OBJECTID",
                source: [feature],
                fields: [],
                renderer: polygonRenderer
              });
              zoomInToSearchPolygon(polygonToAddToMap);
              polygonLayerAddedToMap = layerToAddToMap;
              // console.log('')
              map.add(polygonLayerAddedToMap);

              feature.checkForSchoolBuffer = true;
              feature.zoning = insideZoning;
              // addBufferAroundSearchPolygonHelper(parcelGeomtry);
            }
            return feature;
          })
        })
        .then(showPopup);

      function showPopup(arrayOfPopupTemplates) {
        view.graphics.items = [];
        var parcelIsMcdOrCannabisPermit = false;
        var popupLocation = event.mapPoint;
        arrayOfPopupTemplates.forEach(function (popupItem) {
          if (popupItem.isCannabisPermit === true || popupItem.isMCD === true) {
            parcelIsMcdOrCannabisPermit = true;
          }
        })
        if (parcelIsMcdOrCannabisPermit) {
          showPopupsForMcdOrCannabisPermits(arrayOfPopupTemplates, popupLocation);
        } else {
          // show pop ups for regular parcels  
          var itemToCheckIfInsideBuffer = arrayOfPopupTemplates.filter(function (popup) {
            return popup.checkForSchoolBuffer === true;
          })[0];
          var tempGeom = itemToCheckIfInsideBuffer.geometry;
          getBufferGeometry(parcelGeomtry)
            .then(function (bufferResponse) {
              var bufferGeometry = bufferResponse[0];
              var centerOfPolygon = {
                type: 'point',
                longitude: bufferGeometry.extent.center.longitude,
                latitude: bufferGeometry.extent.center.latitude
              }
              view.graphics.add(new Graphic({
                geometry: bufferGeometry,
                symbol: {
                  type: 'simple-fill',
                  color: [146, 148, 150, 0.25],
                  style: 'solid',
                  outline: {
                    color: [79, 102, 238, 1],
                    width: 2
                  }
                }
              }));
              view.graphics.add(new Graphic({
                geometry: centerOfPolygon,
                symbol: {
                  type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
                  color: [79, 102, 238, 1],
                  outline: {
                    color: [79, 102, 238, 1],
                    width: 2
                  }
                }
              }));
              showPopupsForRegularParcels(tempGeom, parcelNum, popupLocation, insideZoning, bufferGeometry);
            })
            .catch(function (err) {
              console.log(err)
            })

          if (App.isOnMobile()) {
            UICtrl.changeToNewMapHeight();
          }
        }
      }
    }

    /*
      This function first checks to see if the parcel is insidse a school buffer.
      Then it gets the appropriate popup html to display from getPopupForSearch
    */
    function showPopupsForRegularParcels(geom, searchString, popupLocation, insideZoning, bufferGeom) {
      var polygonTemp = new Polygon(geom);
      var isMcd = false;
      var isCannabisPermit = false;
      var schoolBufferMapServiceUrl = CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.schoolBufferLayerNum;
      var schoolBuferFeatureLayer = new FeatureLayer({
        url: schoolBufferMapServiceUrl
      });
      var attributesFromGeocoder;
      var itemsInsideBufferResponse;
      var spatialRelationship = 'intersects';
      currPopupLocation = popupLocation;
      SearchCtrl.getGeocoderResponse(searchString)
      .then(function (response) {
        var jsonResponse = JSON.parse(response);
        attributesFromGeocoder = jsonResponse.features[0].attributes;
        return;
      })
      .then(function () {
        // check to see if any cannabis permits, schools, or MCD is inside buffer
        var cannabisMapServiceUrl = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetailDev/MapServer';
        var layersToCheckAgainstBuffer = [
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.schoolLayerNum,
          }), 
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.onHoldLayerNum,
          }), 
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.processLayerNum,
          }), 
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.submittedLayerNum,
          }), 
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.underConstructionLayerNum,
          }), 
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.approvedLayerNum,
          }),  
          new FeatureLayer({
            url: cannabisMapServiceUrl + '/' + cannabisRetailLayerMapToNumber.mcdLayerNum,
          }),       
        ];
        console.log(layersToCheckAgainstBuffer)
        var spatialRelationship = 'intersects';
        var promiseArr = layersToCheckAgainstBuffer.map(function(featureLayer) {
          return runSpatialOnGeometryAndLayer(bufferGeom, featureLayer, spatialRelationship)
        });
        return Promise.all(promiseArr);
      })
      .then(function(spatialQueryResponse) {
        itemsInsideBufferResponse = spatialQueryResponse.filter(function(eachResponse) {
          return eachResponse.features.length !== 0;
        })
        console.log(spatialQueryResponse)
        return itemsInsideBufferResponse;
      })
      .then(function (itemsInsideBuffer) {
        var parcelInsideSchoolBuffer = itemsInsideBuffer.filter(function(item) {
          return item.features[0].attributes.CAMPUS;
        }).length > 0;
        if (insideZoning !== 'none') {
          if (parcelInsideSchoolBuffer) {
            insideZoning = 'insideSchoolBuffer';
          }
        }
        var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, attributesFromGeocoder, insideZoning, itemsInsideBuffer);
        var popupArr = [];
        popupArr.push({
          popupTemplate: {
            title: '',
            content: popupHtml
          }
        });
        return popupArr
      })
      .then(function (popupArr) {
        var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArr)
        view.popup.open({
          features: updatedPopups,
          location: popupLocation
        });
      })
    }

    /*
      This function show popups for mcd or cannabis permits
    */
    function showPopupsForMcdOrCannabisPermits(arrayOfPopupTemplates, popupLocation) {
      var filteredPopup = arrayOfPopupTemplates.filter(function (result) {
        return result.popupTemplate !== null && result !== undefined;
      });
      popupItemsArr = filteredPopup.slice(0, filteredPopup.length);

      if (filteredPopup.length > 0) {
        var updatedPopups = addFillerSpaceToPopIfOnlyOne(filteredPopup);
        if (updatedPopups.length > 1) {
          UICtrl.changePopupFooterColor();
        }
        view.popup.open({
          features: updatedPopups,
          location: popupLocation
        });
      }
    }

    /* 
      zoom in to the geometry passed in to parameter
    */
    function zoomInToSearchPolygon(geometryToZoomIn) {
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

    /* 
      return promise that runs a query to check if the polygon is inside the feature layer
    */
    function runSpatialOnGeometryAndLayer(polygonToCheck, featureLayer, spatialRelationship) {
      var promise;
      var query = featureLayer.createQuery();
      query.geometry = polygonToCheck;
      query.spatialRelationship = spatialRelationship;
      promise = featureLayer.queryFeatures(query)
      return promise;
    }

    /*
      Get layers that are turned on and run query to see if intersect added search polygon
    */
    function turnOffSearchLabel(feature) {

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
        });
        var spatialRelToCheck = 'intersects'

        runSpatialOnGeometryAndLayer(searchPolygon, layerToCheck, spatialRelToCheck)
          .then(function (response) {
            if (response.features.length !== 0) {
              polygonLayerAddedToMap.labelsVisible = false;
            }
          })
      }
    }

    function getPopupForSearch(isMcd, isCannabisPermit, attributes, zoningLayer, permitsOrSchoolInsideBufferArr) {
      console.log(permitsOrSchoolInsideBufferArr);
      listOfItemsInsideSearchBuffer = permitsOrSchoolInsideBufferArr;
      
      // console.log('attributes: ', attributes)
      var dbaName;
      var address;
      var type;
      var popupHtml = '';

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
      popupHtml += '<div class="popup-parcel-information-container">'

      if (isCannabisPermit) {
        var permitType = attributes.PermitStatus;
        var divId = permitTypeMapping[permitType].divId;
        dbaName = attributes.dba_name;
        address = attributes.address;
        type = attributes.activities;
        popupHtml +=
          '<div class="cannabis-permit-container">' +
          '<div class="cannabis-permit" id="' + divId + '">' + permitType + '</div>' +
          '</div>' +
          '<div class="align-left retail-name">' + dbaName + '</div>' +
          '<div class="align-left retail-address">' + address + '</div>' +
          '<table class="status-section" >' +
          '<tr>' +
          '<td class="attribute">Status</td>' +
          '<td class="attribute-detail" style="padding-right: 15px">Referred to Planning Department' +
          '</tr>' +
          '<tr>' +
          '<td class="attribute">Type</td>' +
          '<td class="attribute-detail">' + type + '</td>' +
          '</tr>' +
          '</table>'

      } else if (isMcd) {
        dbaName = attributes.DBA || attributes.dba;
        address = attributes.Address || attributes.address;
        popupHtml +=
          '<div class="cannabis-permit-container">' +
          '<div class="cannabis-permit" id="mcd">Existing medical cannabis dispensaries</div>' +
          '</div>' +
          '<div class="align-left retail-name">' + dbaName + '</div>' +
          '<div class="align-left retail-address">' + address + '</div>' +
          '<table class="status-section" >' +
          '<tr>' +
          '<td class="attribute">Type</td>' +
          '<td class="attribute-detail">Existing medical cannabis dispensaries</td>' +
          '</tr>' +
          '</table>'

      } else if (!isMcd && !isCannabisPermit) {
        if (attributes !== undefined) {
          var address = attributes.ADDRESS || attributes.ADDRESSSIMPLE;
          if (!address) {
            address = attributes.mapblklot;
          }
          popupHtml += '<div class="align-left retail-name">' + address + '</div>';
          if (zoningLayer !== 'insideSchoolBuffer' || zoningLayer === 'none') {
            popupHtml +=
              '<table class="status-section" >' +
              '<tr>' +
              '<td class="attribute">Status</td>' +
              '<td class="attribute-detail">No permits associated with this location</td>' +
              '</tr>' 
              if (permitsOrSchoolInsideBufferArr.length !== 0) {
                popupHtml += '<td class="attribute">Nearby</td>' + 
                '<td class="attribute-detail"><a href="javascript:void(0)" class="show-nearby-locations"  >See the list of multiple locations</a></td>'
              }
              popupHtml += '</table>'
          }
        }
      }

      // if (zoningLayer !== 'none') {
      popupHtml += getZoningInformartionForPopup(zoningLayer, isMcd)
      // }
      popupHtml += '</div>'
      return popupHtml;
    }

    function getZoningInformartionForPopup(zoningName, isMcd) {
      var copyOfZoningName = zoningName;
      var zoningImage;
      var planningContactUrl = 'https://sfplanning.org/location-and-hours';
      var discrentionaryMessage = 'Retail Cannabis: Principally permitted'
      if (isMcd) {
        discrentionaryMessage = 'Medical Cannabis: Permitted subject to mandatory Discretionary Review';
      }
      if (copyOfZoningName === 'insideSchoolBuffer') {
        copyOfZoningName = 'This location might be within the buffer distance of a school';
        discrentionaryMessage = '<a target="_blank" href="' + planningContactUrl + '">Check with SF Planning</a> if you can have a cannabis storefront here.'
      } else if (copyOfZoningName === 'none') {
        copyOfZoningName = 'Not Allowed';
        discrentionaryMessage = 'No cannabis activities are allowed in this location';
      }
      switch (zoningName) {
        case 'Allowed with Conditional Use Authorization from SF Planning':
          zoningImage = 'images/legend-conditional-use.svg';
          break;
        case 'Allowed':
          zoningImage = 'images/legend-allow.png';
          break;
        case 'Microbusiness permit allowed':
          zoningImage = 'images/legend-microbusiness.png';
          break;
        case 'insideSchoolBuffer':
          zoningImage = 'images/school.svg';
          break;
        case 'none':
          zoningImage = 'images/legend-not-allowed.svg';
        default:
          break
      }
      var zoningMessage =
        '<div class="zoning-information" style="margin-top:5px">' +
        '<div class="cannabis-zoning">' +
        '<div class="cannabis-zoning-image-container" ><img  class="cannabis-zoning__image" src="' + zoningImage + '"></div>' +
        '<div class="cannabis-zoning__text">' + copyOfZoningName + '</div>' +
        '</div>' +
        '<div class="disretionary-message">' + discrentionaryMessage + '</div> </div>'

      return zoningMessage;
    }

    /*
      This function takes in a negative buffered geometry and checks to see what cannabis zoning it is in. The return type is a string
    */
    function getInsideWhatZoning(negativeBufferedGeometry) {
      var spatialRelToCheck = 'intersects'

      return runSpatialOnGeometryAndLayer(negativeBufferedGeometry, cannabisPermittedWithMicrobusinessLayer, spatialRelToCheck)
        .then(function (response) {
          if (response.features.length !== 0) {
            return 'Microbusiness permit allowed';
          } else {
            return runSpatialOnGeometryAndLayer(negativeBufferedGeometry, cannabisPermittedWithCuLayer, spatialRelToCheck)
          }
        })
        .then(function (response) {
          if (!response.features) {
            return response
          } else {
            if (response.features.length !== 0) {
              return 'Allowed with Conditional Use Authorization from SF Planning';
            } else {
              return runSpatialOnGeometryAndLayer(negativeBufferedGeometry, cannabisPermitedLayer, spatialRelToCheck)
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

    /*
      returns a new feature layer instance
    */
    function createNewFeatureLayer(objectIdField, fields, source, renderer, outFields, geometryType) {
      var newFeatureLayer = new FeatureLayer({
        objectIdField: objectIdField,
        fields: fields,
        source: source,
        renderer: renderer,
        outFields: outFields,
        geometryType: geometryType
      });
      return newFeatureLayer;
    }

    /*
      return number of cannabis zoning geometry is in
    */
    function getNumberOfZoningGeometryIsin(geometryToCheck) {
      var numOfZoningsGeometryIn = 0;
      var spatialRelToCheck = 'intersects';
      return runSpatialOnGeometryAndLayer(geometryToCheck, cannabisPermittedWithMicrobusinessLayer, spatialRelToCheck).then(function (response) {
        if (response && response.features.length !== 0) {
          numOfZoningsGeometryIn += 1;
        }
        return runSpatialOnGeometryAndLayer(geometryToCheck, cannabisPermittedWithCuLayer, spatialRelToCheck)
      })
        .then(function (response) {
          if (response && response.features.length !== 0) {
            numOfZoningsGeometryIn += 1;
          }
          return runSpatialOnGeometryAndLayer(geometryToCheck, cannabisPermitedLayer, spatialRelToCheck)
        })
        .then(function (response) {
          if (response && response.features.length !== 0) {
            numOfZoningsGeometryIn += 1;
          }
          return numOfZoningsGeometryIn;
        });

    }

    /*
      this function adds some filler white space to the popup at the bottom if it is just one
    */
    function addFillerSpaceToPopIfOnlyOne(arrayOfPopups) {
      var copyOfArr = arrayOfPopups.slice(0, arrayOfPopups.length);
      if (copyOfArr.length === 1) {
        if (!App.isOnMobile()) {
          copyOfArr[0].popupTemplate.content += '<div class="filler-space"></div>'
        }
      }
      return copyOfArr
    }

    /*
      this function displays the search polygon, zooms in to it, and displays the popup
    */
    function addSearchPolygonToMapHelper(jsonData, searchType) {
      // var jsonData = JSON.parse(JSON.stringify(jsonData))
      map.remove(polygonLayerAddedToMap)

      var negativeBufferedGeometry;
      var NEGATIVE_BUFFER_DISTANCE_IN_FEET = -0.2;
      var firstResultFeature;
      var firstResultAttributes;

      var isOnMcd = false;
      var isOnCannabisPermit = false;

      var mapBlockLotNum;
      var tempPolygonHolder;
      var featuresFromJsonResponse;
      var geometry;
      var correctedFieldsToUse;

      firstResultFeature = jsonData.features[0];
      firstResultAttributes = firstResultFeature.attributes;
      correctedFieldsToUse = jsonData.fields;
      if (searchType === 'searchingByGeocoder') {
        correctedFieldsToUse.forEach(function (eachField) {
          eachField.type = 'string';
        });
      }
      featuresFromJsonResponse = [jsonData.features[0]];

      featuresFromJsonResponse[0].geometry.type = 'polygon';
      var geometryFromJsonResponse = jsonData.features[0].geometry;
      geometry = new Polygon(geometryFromJsonResponse);
      tempPolygonHolder = new Polygon(geometryFromJsonResponse);
      if (searchType === 'searchingByAttributeTable') {
        mapBlockLotNum = firstResultAttributes.parcelToGeocode;
      } else {
        mapBlockLotNum = firstResultAttributes.blklot;
      }

      mcdLayerOn = isLayerTurnedOn('MCDs');

      negativeBufferedGeometry = geometryEngine.geodesicBuffer(tempPolygonHolder, NEGATIVE_BUFFER_DISTANCE_IN_FEET, "feet");

      var tempSearchLayerToAddToMap = createNewFeatureLayer('OBJECTID', correctedFieldsToUse, featuresFromJsonResponse, polygonRenderer, ["*"], 'polygon')

      polygonLayerAddedToMap = tempSearchLayerToAddToMap;
      map.add(polygonLayerAddedToMap);
      zoomInToSearchPolygon(tempPolygonHolder);

      cancelSpinner();

      if (view.popup.visible) {
        var popupVisible = true;
        if (App.isOnMobile()) {
          UICtrl.changeMapHeightAndHandleTabDisplay(popupVisible);
        }
      }

      // getNumberOfZoningGeometryIsin(negativeBufferedGeometry).then(function(numOfZoningParcelIsIn) {
      //   console.log('num of zoning parcel is in: ', numOfZoningParcelIsIn);
      //   if (numOfZoningParcelIsIn > 1) {
      //     view.popup.open({
      //       title: '',
      //       content: 'Please refer to PIC',
      //       location: geometry.extent.center
      //     })
      //     return Promise.reject('');
      //   } else {
      //     return;
      //   }
      // }) 


      getInsideWhatZoning(negativeBufferedGeometry).then(function (zoningLayer) {
        SearchCtrl.checkIfParcelIsMcd(mapBlockLotNum).then(function (isMcdResponse) {
          isOnMcd = isMcdResponse.features.length !== 0;
          var mcdFeatures = isMcdResponse.features;
          SearchCtrl.searchParcelIsCannabisPermit(mapBlockLotNum).then(function (isCannabisPermitResponse) {
            isOnCannabisPermit = isCannabisPermitResponse.features.length !== 0;
            var cannabisFeatures = isCannabisPermitResponse.features;

            if (isOnMcd && isOnCannabisPermit) {
              var popupArrItems = [];
              isOnMcd = false;
              cannabisFeatures.forEach(function (feature) {
                var currCannabisAttribute = feature.attributes;
                var currCannabisPopupHtml = getPopupForSearch(false, true, currCannabisAttribute, zoningLayer);
                var currCannabisTradeName = feature.attributes.dba_name;
                popupArrItems.push(
                  {
                    popupTemplate: {
                      title: currCannabisTradeName,
                      content: currCannabisPopupHtml
                    }
                  }
                )
              });
              mcdFeatures.forEach(function (feature) {
                var currMcdAttribute = feature.attributes;
                var currMcdHtml = getPopupForSearch(true, false, currMcdAttribute, zoningLayer);
                var currMcdTradeName = feature.attributes.dba;
                popupArrItems.push(
                  {
                    popupTemplate: {
                      title: currMcdTradeName,
                      content: currMcdHtml
                    }
                  }
                )
              });
              var popupLocation = geometry.extent.center;
              showPopupsForMcdOrCannabisPermits(popupArrItems, popupLocation)
            } else if (isOnCannabisPermit) {
              var cannabisPermitAttributes = isCannabisPermitResponse.features[0].attributes;
              isOnMcd = false;
              isOnCannabisPermit = true;
              permitStatus = cannabisPermitAttributes.PermitStatus;
              searchPopupHtml = getPopupForSearch(isOnMcd, isOnCannabisPermit, cannabisPermitAttributes, zoningLayer);
              var popupArrItems = [];
              cannabisFeatures.forEach(function (feature) {
                var currCannabisAttribute = feature.attributes;
                var currCannabisPopupHtml = getPopupForSearch(false, true, currCannabisAttribute, zoningLayer);
                var currCannabisTradeName = currCannabisAttribute.dba_name;
                popupArrItems.push(
                  {
                    popupTemplate: {
                      title: currCannabisTradeName,
                      content: currCannabisPopupHtml
                    }
                  }
                )
              });
              var popupLocation = geometry.extent.center;
              showPopupsForMcdOrCannabisPermits(popupArrItems, popupLocation)

            } else if (isOnMcd) {
              var popupArrItems = [];
              mcdFeatures.forEach(function (feature) {
                var currMcdAttribute = feature.attributes;
                var currMcdHtml = getPopupForSearch(true, false, currMcdAttribute, zoningLayer);
                popupArrItems.push(
                  {
                    popupTemplate: {
                      title: '',
                      content: currMcdHtml
                    }
                  }
                )
              });
              var popupLocation = geometry.extent.center;
              showPopupsForMcdOrCannabisPermits(popupArrItems, popupLocation)
            } else {
              var searchStr = firstResultFeature.attributes.mapblklot || firstResultFeature.attributes.ADDRESSSIMPLE
              showPopupsForRegularParcels(geometryFromJsonResponse, searchStr, geometry.extent.center, zoningLayer)
            }
            if (App.isOnMobile()) {
              view.popup.collapsed = false;
            }
          });
        });
      });
    }

    function performSearchQuery(layerName, id) {
      var mapServiceUrl = CANNABIS_RETAIL_SERVICE_URL;
      if (layerName === 'cannabisPermitOnHold') {
      } else if (layerName === 'cannabisPermitProcessing') {
        mapServiceUrl += '/' + cannabisRetailLayerMapToNumber.onHoldLayerNum;
      } else if (layerName === 'cannabisPermitSubmitted') {
        mapServiceUrl += '/' + cannabisRetailLayerMapToNumber.submittedLayerNum;
      } else if (layerName === 'cannabisPermitsApproved') {
        mapServiceUrl += '/' + cannabisRetailLayerMapToNumber.approvedLayerNum;
      } else if (layerName === 'cannabisPermitsConstruction') {
        mapServiceUrl += '/' + cannabisRetailLayerMapToNumber.underConstructionLayerNum;
      } else if (layerName === 'mcds') {
        mapServiceUrl += '/' + cannabisRetailLayerMapToNumber.mcdLayerNum;
      } else if (layerName === 'schools') {
        mapServiceUrl += '/' + cannabisRetailLayerMapToNumber.schoolLayerNum;
      }
      var query = new Query();
      var queryTask = new QueryTask(mapServiceUrl);
      console.log(mapServiceUrl);
      console.log(id)
      query.returnGeometry = true;
      query.outFields = ["*"];
      query.where = "OBJECTID =" + id    
      return queryTask.execute(query);
    }

    function getQueryTaskPromise(url, queryStr, returnGeom, outFields) {
      var query = new Query();
      var queryTask = new QueryTask(url);
      query.returnGeometry = returnGeom;
      query.outFields = outFields;
      query.where = queryStr;
      return queryTask.execute(query);
    }

    function getAllItemsInsideNeighborhood(neighborhoodFeature) {

      var allCheckboxes = $('input');
      for (var i = 0; i < allCheckboxes.length; i++) {
        allCheckboxes[i].checked = true;
      }
      var allCheckboxesArr = Array.from(allCheckboxes);

      // var neighborhoodGeometry = neighborhoodFeature[0].geometry;
      // console.log(cannabisRetailLayerMapToNumber)
      // console.log(CANNABIS_RETAIL_SERVICE_URL)
      // var layersToCheckAgainstNeighborhood = [
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.schoolLayerNum,
      //   }), 
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.onHoldLayerNum,
      //   }), 
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.processLayerNum,
      //   }), 
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.submittedLayerNum,
      //   }), 
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.underConstructionLayerNum,
      //   }), 
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.approvedLayerNum,
      //   }),  
      //   new FeatureLayer({
      //     url: CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.mcdLayerNum,
      //   }),       
      // ];
      // console.log(layersToCheckAgainstNeighborhood)
      // var spatialRelationship = 'contains';
      // var promiseArr = layersToCheckAgainstNeighborhood.map(function(featureLayer) {
      //   return runSpatialOnGeometryAndLayer(neighborhoodGeometry, featureLayer, spatialRelationship)
      // });
      
      // Promise.all(promiseArr)
      // .then(function(response) {
      //   console.log(response);
      //   var itemsInsideNeighborhood = response.filter(function(item) {
      //     return item.features.length !== 0;
      //   });
      //   console.log(itemsInsideNeighborhood);
      // })
    }

    return {
      getView: function () {
        return view;
      },

      getLayerNumMapping: function () {
        return cannabisRetailLayerMapToNumber;
      },

      getListOfItemsInsideParcelBuffer: function() {
        return listOfItemsInsideSearchBuffer;
      },

      getCurrPopupLocation: function() {
        return currPopupLocation;
      },

      highlightNeighborhoodAndDarkenRest: function(neighborhoodName) {
        view.graphics = [];
        var neighborhoodLayerUrl = CANNABIS_RETAIL_SERVICE_URL + '/' + cannabisRetailLayerMapToNumber.neighborhoodLayerNum;
        var returnGeometry = true;
        var outFields = ["*"];
        var queryString = "(1=1)";

        
        getQueryTaskPromise(neighborhoodLayerUrl, queryString, returnGeometry, outFields)
        .then(function(response) {
          var allNeighborhoodFeatures = response.features;
          var neighborhoodOfInterestIndex;
          for (var i = 0; i < allNeighborhoodFeatures.length; i++) {
            var currNeighhoodName = allNeighborhoodFeatures[i].attributes.NEIGHBORHOOD;
            if (currNeighhoodName === neighborhoodName) {
              neighborhoodOfInterestIndex = i;
              break;
            }
          }

          var neighborhoodOfInterestFeature = allNeighborhoodFeatures.splice(neighborhoodOfInterestIndex, 1);

          getAllItemsInsideNeighborhood(neighborhoodOfInterestFeature);


          var otherNeighborhoodColor = {
            type: 'simple-fill',
            color: [33, 33, 35, 0.5],
            style: 'solid',
            outline: {
              color: [33, 33, 35, 0.1],
              width: 0
            }
          };

          var neighboorOfInterestColor = {
            type: 'simple-fill',
            color: [33, 33, 35, 0],
            style: 'solid',
            outline: {
              color: [79, 102, 238, 1],
              width: 2
            }
          };
          var neighborhoodOfInterestGraphic = new Graphic({
            geometry: neighborhoodOfInterestFeature[0].geometry,
            symbol: neighboorOfInterestColor
          });
          
          allNeighborhoodFeatures.forEach(function(feature) {
            var currGeomtry = feature.geometry;
            var currGraphic = new Graphic({
              geometry: currGeomtry,
              symbol: otherNeighborhoodColor
            });
            view.graphics.add(currGraphic);
          });
          view.graphics.add(neighborhoodOfInterestGraphic);
        })
        .catch(function(err) {
          console.log(err)
        })
      },
      
      updateLayerVisibility: function (event) {
        var checkboxChecked = event.target.checked;
        var superDistLayerNum = cannabisRetailLayerMapToNumber.supervisorDistLayerNum;
        var mapLayerNum = Number(event.target.value);
        var sublayer = mapImageLayer.findSublayerById(parseInt(mapLayerNum));
        var checkBoxChecked = event.target.checked;
        var bufferLayerNum;
        sublayer.visible = checkboxChecked;

        var currLayerUrl = CANNABIS_RETAIL_SERVICE_URL + '/' + mapLayerNum;
        var clickedLayer = new FeatureLayer({
          url: currLayerUrl
        });

        if (polygonLayerAddedToMap) {
          var geometryFromPolygonLayer = polygonLayerAddedToMap.source.items[0].geometry;
          var spatialRelToCheck = 'intersects'
          runSpatialOnGeometryAndLayer(geometryFromPolygonLayer, clickedLayer, spatialRelToCheck)
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
              // console.log("label visible: " + labelIsVisible)
            })
        }

        if (mapLayerNum !== superDistLayerNum) {
          if (mapLayerNum === cannabisRetailLayerMapToNumber.mcdLayerNum || mapLayerNum === cannabisRetailLayerMapToNumber.schoolLayerNum) {
            bufferLayerNum = mapLayerNum + 1;
          } else {
            bufferLayerNum = mapLayerNum + 5;
          }
          if (bufferLayerNum) {
            sublayer = mapImageLayer.findSublayerById(parseInt(bufferLayerNum));
            sublayer.visible = checkboxChecked;
          }
        }
      },

      addSearchPolygonToMapAndPopup: function (jsonData, searchType, tobaccoName) {
        addSearchPolygonToMapHelper(jsonData, searchType, tobaccoName)
      },

      addBufferAroundSearchPolygon: function (geometry) {
        addBufferAroundSearchPolygonHelper(geometry);
      },

      handleNearbyLocationOptionClick(event) {
        var targetVal = event.target;
        var className = event.target.className;
        var layerName = targetVal.title;
        var id = targetVal.firstChild.id;

        if (className === 'multiple-location-td__info') {
          var parentElement = event.target.parentElement;
          layerName = parentElement.firstChild.title;
          id = parentElement.firstChild.id;
        }
        performSearchQuery(layerName, id)
        .then(function(response) {
          var firstFeature = response.features[0];
          var attributes = firstFeature.attributes;
          var geometry = attributes.geometry;
          var polygonColors = {
            type: 'simple-fill',
            color: [255, 255, 255, 1],
            style: 'solid',
            outline: {
              color: [0, 0, 0, 1],
              width: 2
            }
          };
          var pointColor = {
            type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
            color: [0, 0, 0, 1],
            outline: {
              color: [0, 0, 0, 1],
              width: 2
            }
          } 
          var tempPolygon = new Polygon(geometry);
          addPolygonToMap(firstFeature, polygonColors, pointColor);
          zoomInToSearchPolygon(tempPolygon);
        })
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
    var uiSelectors = UICtrl.getUiSelectors();

    function showPopupChoices(searchResponse) {
      $(uiSelectors.modalHeader).css('background', '#1C3E57');
      $(uiSelectors.closeModal).css('color', 'white');
      var modalHtml = '';
      var featureNum = searchResponse.features.length;
      var multipleResultTitleStr = 'Multiple Results - Please select one';
      console.log(searchResponse)
      for (var i = 0; i < featureNum; i++) {
        var currCannabisBusinessName = searchResponse.features[i].attributes.dba_name;
        var currCannabisAddressString = searchResponse.features[i].attributes.address;
        var cannabisId = searchResponse.features[i].attributes.OBJECTID;
        modalHtml += "<div id='" + cannabisId + "'class='messi-button-container'><button class='btn btn-sm multiple-business-selection'>" + currCannabisBusinessName + ':<br>' + currCannabisAddressString + "</button></div>"
      }
      UICtrl.displayModal(multipleResultTitleStr, modalHtml);
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

    function searchByGeocoder(searchStr) {
      return SearchCtrl.getGeocoderResponse(searchStr)
        .then(function (geocodeJsonResponse) {
          if (geocodeJsonResponse !== '') {
            var jsonResponseCopy = JSON.parse(geocodeJsonResponse);
            var features = jsonResponseCopy.features;
            var featureLength = features.length;
            if (featureLength > 0) {
              jsonResponseCopy.type = 'polygon';
              var searchType = 'searchingByGeocoder';
              MapCtrl.addSearchPolygonToMapAndPopup(jsonResponseCopy, searchType);
              var geometryToBuffer = jsonResponseCopy.features[0].geometry;
              MapCtrl.addBufferAroundSearchPolygon(geometryToBuffer);
              return true;
            }
          } else {
            return false;
          }
        });
    }

    function searchByAddressInGISData(searchStr) {
      return SearchCtrl.getSearchByAddressResponsePromise(searchStr)
        .then(function (response) {
          console.log(response);
          var features = response.features;
          var numOfFeatures = features.length;
          if (numOfFeatures > 1) {
            showPopupChoices(response);
            return true;
          } else if (numOfFeatures === 1) {
            var cannabisRetailName = response.features[0].attributes.dba_name;
            MapCtrl.addSearchPolygonToMapAndPopup(response, 'searchingByAttributeTable', cannabisRetailName);
            return true;
          } else {
            return false;
          }
        })
    }

    function searchByNameInGISData(searchStr) {
      return SearchCtrl.getSearchByStoreNameResponsePromise(searchStr)
        .then(function (response) {
          var features = response.features;
          var numOfFeatures = features.length;
          if (numOfFeatures > 1) {
            showPopupChoices(response);
            return true;
          } else if (numOfFeatures === 1) {
            var cannabisRetailName = response.features[0].attributes.dba_name;
            MapCtrl.addSearchPolygonToMapAndPopup(response, 'searchingByAttributeTable', cannabisRetailName);
            return true;
          } else {
            return false;
          }
        })
    }

    /*
      This function handles the searching iterations. 
    */
    function handleSearching(searchStr) {
      searchByGeocoder(searchStr).then(function (geocodeSuccess) {
        return geocodeSuccess;
      })
        .then(function (geocodeSucess) {
          if (geocodeSucess) {
            UICtrl.resetMobileTabLogosToDefault();
            return Promise.reject('');
          } else {
            searchByAddressInGISData(searchStr).then(function (searchByAddressSuccess) {
              if (!searchByAddressSuccess) {
                searchByNameInGISData(searchStr).then(function (searchByNameSuccess) {
                  if (searchByNameSuccess) {
                    UICtrl.resetMobileTabLogosToDefault();
                    return Promise.reject('');
                  } else {
                    var bodyDisplayStr = 'Please try again';
                    var titleDisplayStr = 'No Results For ' + searchStr;
                    UICtrl.displayModal(titleDisplayStr, bodyDisplayStr);
                  }
                });
              } else {
                UICtrl.resetMobileTabLogosToDefault();
              }
            });
          }
        });
    }

    function sortByNeighborhoodName(item1, item2) {
      var attribute1 = item1.attributes["NEIGHBORHOOD"];
      var attribute2 = item2.attributes["NEIGHBORHOOD"];
      return attribute1 < attribute2 ? -1 : 1;
  }

    function popuplateNeighborhoods() {
      var neighborhoodList = $(uiSelectors.neighborhoodList);
      var neighborhoodListGetRequestUrl = 'http://sfplanninggis.org/arcgiswa/rest/services/CannabisRetailDev/MapServer/21/query?where=NEIGHBORHOOD+like+%27%25%25%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=&returnGeometry=true&returnTrueCurves=true&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=json'

      // var queryUrl = plantsfGeocoderUrl + "/query?where=Address+like+%27" + searchStr + "%%27&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=Address,Priority&returnGeometry=false&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&resultRecordCount=9&returnExtentOnly=false&f=json"

      $.get(neighborhoodListGetRequestUrl, function(data, status) {
        var listOfNeighborhoods = data.features;
        var sortedNeighborhoods = listOfNeighborhoods.sort(sortByNeighborhoodName);
        sortedNeighborhoods.forEach(function(eachFeature) {
          var currNeighborhoodHtml = '<li class="each-neighborhood">' + eachFeature.attributes.NEIGHBORHOOD + '</li>'
          neighborhoodList.append(currNeighborhoodHtml)
        });        
      })
    }

    function isOnMobileHelper() {
      var windowWidth = window.innerWidth;
      return windowWidth < 544 ? true : false;
    }

    function listenForEvents() {
      var uiSelectors = UICtrl.getUiSelectors();

      $(uiSelectors.searchBox).submit(function (event) {
        callLoadSpinner()
        event.preventDefault();
        var searchString = $('#addressInput').val();
        handleSearching(searchString)
      });

      $('input').change(function(event) {
        console.log('checkbox changeeeeeed')
        MapCtrl.updateLayerVisibility(event)
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
        var clickedOnMultipleLocationOption = currClassName.indexOf('multiple-location-td') !== -1 || parentElementClassName.indexOf('multiple-location-td__info') !== -1;

        if (currClassName.indexOf('btn-search') !== -1 || currClassName.indexOf('fa-search') !== -1 || currClassName.indexOf('input-group-append') !== -1) {
          var searchStr = $('#addressInput').val();
          handleSearching(searchStr);
        }

        if (currClassName.indexOf('esri-popup__icon esri-icon-close') !== -1) {
          if (isOnMobileHelper()) {
            UICtrl.changeToNewMapHeight();
          }
        }

        if (currClassName.indexOf('each-neighborhood') !== -1) {
          var neighborhoodName = event.target.innerHTML;
          MapCtrl.highlightNeighborhoodAndDarkenRest(neighborhoodName);
        }

        if (currClassName.indexOf('show-nearby-locations') !== -1) {
          PopupCtrl.setIsOnMultipleView(true);
          UICtrl.showNearByLocationOnPopup();
        }

        if (clickedOnMultipleLocationOption) {
          MapCtrl.handleNearbyLocationOptionClick(event);
        }

        var clickedOnListItemInPopup = currClassName.indexOf('esri-popup__feature-menu-item') !== -1 || currClassName.indexOf('esri-popup__feature-menu-title') !== -1 || currClassName.indexOf('esri-icon-check-mark') !== -1 || currClassName.indexOf('esri-popup__feature-menu-title') !== -1 || parentElementClassName.indexOf('esri-popup__feature-menu-title') !== -1;
        if (clickedOnListItemInPopup) {
          $('.esri-popup__main-container').css({ 'border-top-right-radius': '8px', 'border-top-left-radius': '8px' })
          // console.log('clicked on item')
          $('.esri-popup__pagination-previous').css({ 'margin-left': '0px' });
          $('.esri-popup__pagination-next').css({ 'margin-right': '0px' });
        }

        // User has selected on a choice at this point
        if ((currClassName.indexOf(MULTIPLE_BUSINESS_SELECTION_CLASS) !== -1) && (parentElementClassName === 'messi-button-container')) {
          var currIDName = parentElement.id;
          var searchType = 'findByExactMatch'
          MapCtrl.searchByNameInAttributeTable(clickedBusinessName, clickedBusinessAddress, searchType, currIDName)
            .then(function (response) {
              var nameOfTobaccoRetail = response.features[0].attributes.dba_name;
              var numOfFeatures = response.features.length;
              console.log(numOfFeatures)
              if (numOfFeatures === 1) {
                console.log(response, nameOfTobaccoRetail)
                MapCtrl.addSearchPolygonToMapAndPopup(response, 'searchingByAttributeTable', nameOfTobaccoRetail);
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
        // if (clickedType === 'checkbox') {
        //   MapCtrl.updateLayerVisibility(event)
        // }
      })
    }

    return {
      isOnMobile: function () {
        return isOnMobileHelper();
      },
      init: function () {
        $(document).ready(function () {
          listenForEvents();
          UICtrl.listenForScrollingForLocationMenu();
          UICtrl.listenForLegendAccordionToggle();
          UICtrl.listenForMobileAlert();
          popuplateNeighborhoods();
        })
        if (this.isOnMobile()) {
          $('#addressInput')[0].placeholder = 'Search';
        } else {
          $('#addressInput')[0].placeholder = 'Search for an address, business name, or parcel number';
        }
      },
    }
  }();
  App.init();
});

function showMultipleLocationInsideBufferPopup(itemsArr) {
  console.log('hellooooooooo');
  console.log(itemsArr);
}

function callLoadSpinner() {
  $('#spinnerLargeMap').show();
  $('#map').addClass('disabledDIV');
}

function cancelSpinner() {
  $('#spinnerLargeMap').hide();
  $('#map').removeClass('disabledDIV');
}

function highLightTabClicked(event) {
  var imageChild = event.querySelector('img');
  var imageId = imageChild.id;
  var imageSrc = document.querySelector('#' + imageId).getAttribute('src');
  var legendAlreadySelected = event.classList.contains('selected')
  if (legendAlreadySelected) {
    var nonActiveLogoSrc = imageSrc.replace('-active', '');
    $('#' + imageId).attr('src', nonActiveLogoSrc);
    $('.tab-display-container').css('display', 'none');
    event.classList.remove('selected');

  } else {
    var legendElements = $('.legend-element');
    $('.tab-display-container').css('display', 'block');
    for (var i = 0; i < legendElements.length; i++) {
      legendElements[i].classList.remove('selected');
    }
    event.classList.add('selected');
  }
}

function showLegendOnMobileTab() {
  $('#mobile-legend').css('display', 'block');
  $('#filter-container').css('display', 'none');
  $('#legend-logo').attr('src', 'images/legend-active.svg');
  $('#locations-logo').attr('src', 'images/Location.svg');
}

function showFilterOnMobileTab() {
  $('#mobile-legend').css('display', 'none');
  $('#filter-container').css('display', 'block');
  $('#locations-logo').attr('src', 'images/Location-active.svg')
  $('#legend-logo').attr('src', 'images/legend.svg');
}