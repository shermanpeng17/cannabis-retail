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

/*

  MODULES
    - MapCtrl
      - does anything map related
      - initalizes map related variables such as map, view, 
    - SearchCtrl
      - does all the searches 
        - geocoder
        - calling query tasks
        - all should return a promise
    - UICtrl
    - PopupCtrl
      - response for constructing html used for popup, might only need couple of functions
    - App

*/


require(["esri/Map", "esri/views/MapView", "esri/layers/FeatureLayer", "esri/layers/MapImageLayer", "esri/widgets/BasemapToggle", "esri/renderers/SimpleRenderer", "esri/tasks/IdentifyTask", "esri/tasks/support/IdentifyParameters", "esri/geometry/geometryEngine", "esri/geometry/Polygon", "esri/tasks/QueryTask", "esri/tasks/support/Query", "esri/renderers/SimpleRenderer"], function (Map, MapView, FeatureLayer, MapImageLayer, BasemapToggle, SimpleRenderer, IdentifyTask, IdentifyParameters, geometryEngine, Polygon, QueryTask, Query, SimpleRenderer) {

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

  var PopupCtrl = function () {

    return {
      getPopupHtml: function (permitStatus, featureAttributes, zoning) {

      },

      showPopup: function (view, polygon, popupHtml) {
        view.popup.open({
          content: popupHtml,
          location: polygon.extent.center
        });
      }
    }
  }();


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

      popupBottomPointerArrow: '.esri-popup__pointer-direction'
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

      changePopupFooterColor: function() {
        var grayFooterColorHex = '#E9E9E9';
        console.log('chaning pointer color')
        $('.esri-popup__pointer-direction').css('background', grayFooterColorHex);
        $('.esri-popup__navigation').css('background', grayFooterColorHex);
        $('.esri-popup__footer').css('background', grayFooterColorHex);
      },

      listenForMobileAlert: function () {
        $(uiSelectors.alertMobile).click(function () {
          console.log('you cliekd on alert')
          var disclaimerMessage = 'Map Layers include 600 ft buffers aroud the property. Use this map only as an estimate <br><br> Contact SF Planning to confirm eligibility of a location';
          $(uiSelectors.modalHeader).css('background', 'white');
          $(uiSelectors.modalHeader).css('border-bottom', 'none')
          $(uiSelectors.closeModal).css('color', '#1C3E57');

          $(uiSelectors.modalBody).html(disclaimerMessage);
          $(uiSelectors.modalTitle).html('');
          $(uiSelectors.modalDisplay).modal('show');
        });
      },

      listenForScrollingForLegendMenu: function() {
        $(uiSelectors.tabDisplayContainer).mouseup(function() {
          console.log($(this))
          console.log('regular height ', $(this).height())
          console.log('scroll height ', $(this).get(0).scrollHeight)
          // if ($(this).get(0).scrollHeight > $(this).height()) {
          //   console.log('has scroll')
          // }

          // if ($(this).get(0).scrollHeight > $(this).height()) {
          //   console.log('has scroll')
          // } else {
          //   console.log('has no scroll')
          // }
          // // console.log('scrolling in legend tab');
          // // if ($(this).scrollTop() + $(this).height() === $(uiSelectors.tabDisplayContainer).height()) {
          // //   // at top of scroll
          // //   console.log('add top')
          // //   $(this).css('box-shadow', 'inset 0px -40px 41px -44px rgba(0,0,0,0.2)')

          // // } 
        });
      }, 

      listenForScrollingForLocationMenu: function () {
        $(uiSelectors.mobileFilterContainer).scroll(function () {
          console.log('scrolling on filter tab')
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
          }
        });
      },

      displayMobileDisclaimer: function () {
        var disclaimerMessage = 'Map Layers include 600 ft buffers aroud the property. Use this map only as an estimate <br><br> Contact SF Planning to confirm eligibility of a location';
        this.displayModal('', disclaimerMessage)
      },

      highLightClickedTab: function (clickedElement) {
        console.log('in highlight clicked tab');
        var tmpClickElement = clickedElement;

        var clickedElementClassName = tmpClickElement.className;

        console.log(tmpClickElement.parentElement);

        // while (clickedElementClassName.indexOf('legend-element') === -1) {
        //   console.log(tmpClickElement);
        //   tmpClickElement = clickedElement.parentElement;
        //   clickedElementClassName = tmpClickElement.className;
        // }

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
          console.log(tmpClickElement)
        }
      },

      changeMapHeightAndHandleTabDisplay: function (popupIsVisible) {
        var mapView = MapCtrl.getView();


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
    var popupItemsArr;

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
      parcelLabelLayerNum: ''
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
      color: [146, 148, 150, 0.25],
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

    console.log(map)

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

      // if (view.popup.visible) {
      //   console.log('popup already here yo')
      // }
      view.watch("popup.visible", function (newVal, oldVal) {
        console.log('opening popup....')
        console.log(popupItemsArr)
        if (popupItemsArr && popupItemsArr.length > 1) {
          UICtrl.changePopupFooterColor();
        }
        // if (popupItemsArr.length > 1) {
        //   UICtrl.changePopupFooterColor();
        // }
        // console.log('new value for popup: ', newVal)
        if (newVal === true) {
          if (App.isOnMobile()) {
            UICtrl.changeMapHeightAndHandleTabDisplay(newVal);
          }
        } else if (newVal === false) {
            // UICtrl.changeMapHeightAndHandleTabDisplay(newVal);
            // console.log('popup closed...');
            // var uiSelectors = UICtrl.getUiSelectors();
            // var contentContainerHeight = $(uiSelectors.contentContainer).height();
            // var tabHeightsAtBottomOfScreen = 60;
            // var newMapHeight = contentContainerHeight - tabHeightsAtBottomOfScreen;
            // $(uiSelectors.mapContainer).css('height', newMapHeight.toString());

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



    function isSmallView() {
      var windowWidth = window.innerWidth;
      console.log(windowWidth)
      return windowWidth < 992 ? true : false;
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
          default:
            break;
        }
      });
    }

    /*
      Add a feature layer to the map based on search results
    */
    function addClickedPolygonLayerToMap(geometry, identifyResults) {

      console.log('in add click polygon layer to map')
      map.remove(polygonLayerAddedToMap)

      var features = [identifyResults[0].feature];
      var polygonColoringForInputSearch = {
        type: 'simple-fill',
        color: [146, 148, 150, 0.25],
        style: 'solid',
        outline: {
          color: [79, 102, 238, 1],
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

    function handleClickingOnMcd() {

    }

    function handleNonMcd() {

    }

    function isLayerTurnedOn(layerName) {
      var layerToCheck = mapImageLayer.allSublayers.items.filter(function (layer) {
        return layer.title === layerName
      });
      return layerToCheck[0].visible;
    }

    function executeIdentifyTask(event) {
      /*
        Runs identify task to see if clicked parcel is a cannabis retail. 
        Also runs a check to see if it is inside a permitted layer
      */
      var identifyTask = new IdentifyTask(CANNABIS_RETAIL_SERVICE_URL);
      var identifyParams = new IdentifyParameters();

      var parcelAttributes;
      var parcelNum;
      var insideZoning = 'none';

      var clickedParcelInsideCannabisRetail = true;
      identifyParams.tolerance = 0;
      identifyParams.returnGeometry = true;
      identifyParams.layerIds = [

        cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_LAYER_NUM,
        cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITHCU_LAYER_NUM,
        cannabisRetailLayerMapToNumber.CANNABIS_PERMITTED_WITH_MICROBUSINESS_LAYER_NUM,
        cannabisRetailLayerMapToNumber.parcelLabelLayerNum,

        cannabisRetailLayerMapToNumber.mcdLayerNum,

        cannabisRetailLayerMapToNumber.cannabisLocationsLayer,


      ];
      identifyParams.layerOption = 'all';
      identifyParams.width = view.width;
      identifyParams.height = view.height;
      identifyParams.geometry = event.mapPoint;
      identifyParams.mapExtent = view.extent;

      // logic = check first item layer name. then use name to see if layer is turned on, if turned on then display mcd popup. else if layer not turned on then use next item in array and then identify 

      identifyTask
        .execute(identifyParams)
        .then(function (response) {
          map.remove(polygonLayerAddedToMap)
          var results = response.results
          return results.map(function(result) {
            var feature = result.feature;
            var layerName = result.layerName;
            var featureAttributes = feature.attributes;
            var geometry = feature.geometry;

            if (layerName === 'Permitted') {
              insideZoning = 'Allowed';
              // console.log(insideZoning)
            } else if (layerName === 'PermittedWithCU') {
              insideZoning = 'Allowed with Conditional Use Authorization from SF Planning';
            } else if (layerName === 'PermittedWithMicrobusiness') {
              insideZoning = 'Microbusiness permit allowed';
            } else if (layerName === 'MCDs') {
              var mcdTradeName = result.feature.attributes.DBA;
              var isMcd = true;
              var isCannabisPermit = false;
              var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, featureAttributes, insideZoning);

              feature.popupTemplate = {
                title: mcdTradeName,
                content: popupHtml
              }
              // return feature;

            } else if (layerName === 'CannabisLocations_OOC') {
              var cannabisTradeName = result.feature.attributes.dba_name;
              var isMcd = false;
              var isCannabisPermit = true;
              var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, featureAttributes, insideZoning);
              feature.popupTemplate = {
                title: cannabisTradeName,
                content: popupHtml
              }
              // return feature;

            } else if (layerName === 'Parcel Labels') {
              console.log(insideZoning)
              var isMcd = false;
              var isCannabisPermit = false;
              parcelNum = featureAttributes.mapblklot;
              parcelAttributes = featureAttributes;
              var tempPolygon = new Polygon(feature.geometry)
              var layerToAddToMap = new FeatureLayer({
                objectIdField: "OBJECTID",
                source: [feature],
                fields: [],
                renderer: polygonRenderer
              });
              // var NEGATIVE_BUFFER_DISTANCE_IN_FEET = -0.2;
              
              // negativeBufferedGeometry = geometryEngine.geodesicBuffer(tempPolygon, NEGATIVE_BUFFER_DISTANCE_IN_FEET, "feet");
              // getInsideWhatZoning(negativeBufferedGeometry).then(function(zoningName) {
              //   console.log('inside zoning', zoningName);
              //   if (zoningName === 'none') {
              //     return undefined
              //   } 
              //   return feature;
              // })
              zoomInToSearchPolygon(tempPolygon)
              polygonLayerAddedToMap = layerToAddToMap
              map.add(polygonLayerAddedToMap)
              feature.zoning = insideZoning;
              // feature.insideZoning = insideZoning;
              // return feature;

            }
            return feature;
          })

        })
       
        .then(showPopup);

        function showPopup(response) {
          console.log(response)
          var filteredPopup = response.filter(function(result) {
            // return result.popupTemplate !== null;
            // if (result !== undefined || result.popupTemplate !== null) {
            //   return result;
            // } 
            // return;
            return result.popupTemplate !== null && result !== undefined ;
          });

          popupItemsArr = filteredPopup.slice(0, filteredPopup.length);
          console.log(popupItemsArr)

          // add popup for regular parcel. 
          if (filteredPopup.length === 0) {
            if (parcelNum === undefined) {
              var isMcd = false;
              var isCannabisPermit = false;
              var attributeVals = undefined;
              var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, attributeVals, insideZoning);

              var popupArr = [];
              popupArr.push({
                popupTemplate: {
                  title: '',
                  content: popupHtml
                }
              });
              var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArr)

              view.popup.open({
                features: updatedPopups,
                location: event.mapPoint
              });
            } else {
              SearchCtrl.getGeocoderResponse(parcelNum).then(function(response) {
                var jsonResponse = JSON.parse(response);
                var attributes = jsonResponse.features[0].attributes;
                var isMcd = false;
                var isCannabisPermit = false;
                var popupHtml = getPopupForSearch(isMcd, isCannabisPermit, attributes, insideZoning);

                var popupArr = [];
                popupArr.push({
                  popupTemplate: {
                    title: '',
                    content: popupHtml
                  }
                });
                var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArr)

                view.popup.open({
                  features: updatedPopups,
                  location: event.mapPoint
                });
                document.getElementById("map").style.cursor = "auto";
              })
            }

          } else {
            if (filteredPopup.length > 0) {
              var updatedPopups = addFillerSpaceToPopIfOnlyOne(filteredPopup)

              view.popup.open({
                features: updatedPopups,
                location: event.mapPoint
              });
            }
          }
        document.getElementById("map").style.cursor = "auto";
          // document.getElementById("map").style.cursor = "auto";
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
    function getPolygonWithinLayerPromise(polygonToCheck, featureLayer, spatialRelationship) {
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

        getPolygonWithinLayerPromise(searchPolygon, layerToCheck, spatialRelToCheck)
          .then(function (response) {
            if (response.features.length !== 0) {
              polygonLayerAddedToMap.labelsVisible = false;
            }
          })
      }
    }

    function getPopupForSearch(isMcd, isCannabisPermit, attributes, zoningLayer, ) {
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

      if (isCannabisPermit) {
        var permitType = attributes.PermitStatus;
        var divId = permitTypeMapping[permitType].divId;
        dbaName = attributes.dba_name;
        address = attributes.address;
        type = attributes.activities;
        popupHtml +=
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
      } else if (isMcd) {
        dbaName = attributes.DBA || attributes.dba;
        address = attributes.Address || attributes.address;
        popupHtml +=
          `
        <div class="cannabis-permit-container">
          <div class="cannabis-permit" id="mcd">Existing medical cannabis dispensaries</div>
        </div>
        <div class="align-left retail-name"> ${dbaName} </div>
        <div class="align-left retail-address"> ${address} </div>
        <table class="status-section" >
          <tr>
            <td class="attribute">Type</td>
            <td class="attribute-detail">Existing medical cannabis dispensaries</td>
          </tr>
        </table>
        `
      } else if (!isMcd && !isCannabisPermit) {
        if (attributes !== undefined) {
          var address = attributes.ADDRESS || attributes.ADDRESSSIMPLE;
          if (!address) {
            address = attributes.mapblklot;
          }
          popupHtml +=
          `
            <div class="align-left retail-name"> ${address} </div>
            <table class="status-section" >
              <tr>
                <td class="attribute">Status</td>
                <td class="attribute-detail">No permits associated with this location</td>
              </tr>
            </table>
          `
        }
      }

      if (zoningLayer !== 'none') {
        popupHtml += getZoningInformartionForPopup(zoningLayer)
      }
      // if (!isMcd && ! isCannabisPermit) {
      //   popupHtml += '<div class="filler-space"></div>'
      // }
      return popupHtml;
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
        '<div class="cannabis-zoning">' +
        '<div ><img  class="cannabis-zoning__image" src="' + zoningImage + '"></div>' +
        '<div class="cannabis-zoning__text">' + zoningName + '</div>' +
        '</div>' +
        '<div class="disretionary-message">' + dicrentionaryMessage + '</div> </div>'

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

    /*
      This function takes in a negative buffered geometry and checks to see what cannabis zoning it is in. The return type is a string
    */
    function getInsideWhatZoning(negativeBufferedGeometry) {
      console.log('inside get what zoning func')
      var spatialRelToCheck = 'intersects'

      return getPolygonWithinLayerPromise(negativeBufferedGeometry, cannabisPermittedWithMicrobusinessLayer, spatialRelToCheck)
        .then(function (response) {
          if (response.features.length !== 0) {
            return 'Microbusiness permit allowed';
          } else {
            return getPolygonWithinLayerPromise(negativeBufferedGeometry, cannabisPermittedWithCuLayer, spatialRelToCheck)
          }
        })
        .then(function (response) {
          if (!response.features) {
            return response
          } else {
            if (response.features.length !== 0) {
              return 'Allowed with Conditional Use Authorization from SF Planning';
            } else {
              return getPolygonWithinLayerPromise(negativeBufferedGeometry, cannabisPermitedLayer, spatialRelToCheck)
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

    function checkIfParcelIsInTwoZoning(geometryToCheck) {
      // checks to see if parcel is in more than 1 zoning. parcel 3547261 is one of them
      var numOfZoningsGeometryIn = 0;
      var spatialRelToCheck = 'intersects';
      return getPolygonWithinLayerPromise(geometryToCheck, cannabisPermittedWithMicrobusinessLayer, spatialRelToCheck).then(function (response) {
        if (response && response.features.length !== 0) {
          numOfZoningsGeometryIn += 1;          
        }
        return getPolygonWithinLayerPromise(geometryToCheck, cannabisPermittedWithCuLayer, spatialRelToCheck)
        })
        .then(function (response) {
          if (response && response.features.length !== 0) {
            numOfZoningsGeometryIn += 1;
          }
          return getPolygonWithinLayerPromise(geometryToCheck, cannabisPermitedLayer, spatialRelToCheck) 
        })    
        .then(function(response) {
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

    // function getPopupArr(features, isMcd, isCannabisPermit) {
    //   var popupItemArr = [];
    //   features.forEach(function(feature) {

    //   })
    // }

    /*
      this function displays the search polygon, zooms in to it, and displays the popup
    */
    function addSearchPolygonToMapHelper(jsonData, searchType, nameOfCannabisRetail) {
      // var jsonData = JSON.parse(JSON.stringify(jsonData))
      map.remove(polygonLayerAddedToMap)

      var negativeBufferedGeometry;
      var NEGATIVE_BUFFER_DISTANCE_IN_FEET = -0.2;
      var firstResult;
      var firstResultFeature;
      var firstResultAttributes;

      var isOnMcd = false;
      var isOnCannabisPermit = false;

      var mapBlockLotNum;
      var mcdLayerOn;
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

      checkIfParcelIsInTwoZoning(negativeBufferedGeometry).then(function(numOfZoningParcelIsIn) {
        console.log('num of zoning parcel is in: ', numOfZoningParcelIsIn);
        if (numOfZoningParcelIsIn > 1) {
          view.popup.open({
            title: '',
            content: 'Please refer to PIC',
            location: geometry.extent.center
          })
          return Promise.reject('');
        } else {
          return;
        }
      }) 
      .then(function() {
        getInsideWhatZoning(negativeBufferedGeometry).then(function (zoningLayer) {
          console.log('inside zoning: ', zoningLayer)
          SearchCtrl.checkIfParcelIsMcd(mapBlockLotNum).then(function (isMcdResponse) {
            isOnMcd = isMcdResponse.features.length !== 0;
            var mcdFeatures = isMcdResponse.features;
            SearchCtrl.searchParcelIsCannabisPermit(mapBlockLotNum).then(function (isCannabisPermitResponse) {
              isOnCannabisPermit = isCannabisPermitResponse.features.length !== 0;
              var cannabisFeatures = isCannabisPermitResponse.features;
  
              if (isOnMcd && isOnCannabisPermit) {
                var popupArrItems = [];
                isOnMcd = false;
  
                cannabisFeatures.forEach(function(feature) {
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
                mcdFeatures.forEach(function(feature) {
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
                var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArrItems)
                if (updatedPopups.length > 1) {
                  UICtrl.changePopupFooterColor();
                }
                view.popup.open({
                  features: popupArrItems,
                  location: geometry.extent.center
                });
              } else if (isOnCannabisPermit) {
                var cannabisPermitAttributes = isCannabisPermitResponse.features[0].attributes;
                isOnMcd = false;
                isOnCannabisPermit = true;
                permitStatus = cannabisPermitAttributes.PermitStatus;
                searchPopupHtml = getPopupForSearch(isOnMcd, isOnCannabisPermit, cannabisPermitAttributes, zoningLayer);
                var popupArrItems = [];
                cannabisFeatures.forEach(function(feature) {
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
                var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArrItems)
  
                view.popup.open({
                  features: updatedPopups,
                  location: geometry.extent.center
                });
              } else if (isOnMcd) {
                var popupArrItems = [];
                mcdFeatures.forEach(function(feature) {
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
                var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArrItems)
                view.popup.open({
                  features: updatedPopups,
                  location: geometry.extent.center
                });
              } else {
                if (!firstResultAttributes.ADDRESS && !firstResultAttributes.ADDRESSSIMPLE) {
                  // call geocoder if no address
                  SearchCtrl.getGeocoderResponse(mapBlockLotNum)
                  .then(function(response) {
                    var jsonResponse = JSON.parse(response);
                    var clickedParcelAttributes = jsonResponse.features[0].attributes;
                    searchPopupHtml = getPopupForSearch(isOnMcd, isOnCannabisPermit, clickedParcelAttributes, zoningLayer);
                    var popupArrItems = [];
                    popupArrItems.push(
                      {
                        popupTemplate: {
                          title: '',
                          content: searchPopupHtml
                        }
                      }
                    )
                    var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArrItems)
                    view.popup.open({
                      features: updatedPopups,
                      location: geometry.extent.center
                    });
                  })
                } else {
                  searchPopupHtml = getPopupForSearch(isOnMcd, isOnCannabisPermit, firstResultAttributes, zoningLayer);
                  var popupArrItems = [];
                  popupArrItems.push(
                    {
                      popupTemplate: {
                        title: '',
                        content: searchPopupHtml
                      }
                    }
                  )
                  var updatedPopups = addFillerSpaceToPopIfOnlyOne(popupArrItems)
  
                  view.popup.open({
                    features: updatedPopups,
                    location: geometry.extent.center
                  });
                }
              }
              if (App.isOnMobile()) {
                view.popup.collapsed = false; 
              }
            });
          });
        });
      })     

      
    }

    return {
      getView: function () {
        return view;
      },

      getLayerNumMapping: function () {
        return cannabisRetailLayerMapToNumber;
      },

      updateLayerVisibility: function (event) {
        var superDistLayerNum = cannabisRetailLayerMapToNumber.supervisorDistLayerNum;
        var mapLayerNum = Number(event.target.value);
        var sublayer = mapImageLayer.findSublayerById(parseInt(mapLayerNum));
        var checkBoxChecked = event.target.checked;
        var bufferLayerNum;
        sublayer.visible = !sublayer.visible;

        var currLayerUrl = CANNABIS_RETAIL_SERVICE_URL + '/' + mapLayerNum;
        var clickedLayer = new FeatureLayer({
          url: currLayerUrl
        });

        if (polygonLayerAddedToMap) {
          var geometryFromPolygonLayer = polygonLayerAddedToMap.source.items[0].geometry;
          var spatialRelToCheck = 'intersects'
          getPolygonWithinLayerPromise(geometryFromPolygonLayer, clickedLayer, spatialRelToCheck)
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

        if (mapLayerNum !== superDistLayerNum) {
          if (mapLayerNum === cannabisRetailLayerMapToNumber.mcdLayerNum || mapLayerNum === cannabisRetailLayerMapToNumber.schoolLayerNum) {
            bufferLayerNum = mapLayerNum + 1;
          } else {
            bufferLayerNum = mapLayerNum + 5;
          }
          if (bufferLayerNum) {
            sublayer = mapImageLayer.findSublayerById(parseInt(bufferLayerNum));
            sublayer.visible = !sublayer.visible;
          }
        }
      },

      addSearchPolygonToMapAndPopup: function (jsonData, searchType, tobaccoName) {
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
      var uiSelectors = UICtrl.getUiSelectors();
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

    // function getGeocoderResponse(geocoderUrl, searchVal) {
    //   return $.get(geocoderUrl)
    //     .then(function (response) {
    //       return JSON.parse(response)
    //     })
    // }

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

    // function performSearches(searchStr) {
    //   var geocoderWithSearchValUrl = GEOCODER_URL + searchStr;
    //   getGeocoderResponse(geocoderWithSearchValUrl).then(function (jsonResponse) {
    //     var responseFeatures = jsonResponse.features;
    //     var responseFeaturesLength = responseFeatures.length;
    //     if (responseFeaturesLength > 0) {
    //       jsonResponse.type = 'polygon';
    //       if (jsonResponse['error']) {
    //         return
    //       } else {
    //         MapCtrl.addSearchPolygonToMap(jsonResponse, 'searchingByGeocoder');
    //       }
    //     } else {
    //       // search by address 
    //       MapCtrl.searchByAddressInAttributeTable(searchStr)
    //         .then(function (response) {
    //           var numOfFeatures = response.features.length;
    //           if (numOfFeatures > 0) {
    //             if (numOfFeatures > 1) {
    //               showPopupChoices(response)
    //             } else if (numOfFeatures === 1) {
    //               var cannabisRetailName = response.features[0].attributes.dba_name;
    //               MapCtrl.addSearchPolygonToMap(response, 'searchingByAttributeTable', cannabisRetailName);
    //             }
    //           } else {
    //             MapCtrl.searchByNameInAttributeTable(searchStr)
    //               .then(function (response) {
    //                 var numOfFeatures = response.features.length;
    //                 if (numOfFeatures > 1) {
    //                   showPopupChoices(response);
    //                 }
    //                 else if (numOfFeatures === 1) {
    //                   var cannabisRetailName = response.features[0].attributes.dba_name;
    //                   MapCtrl.addSearchPolygonToMap(response, 'searchingByAttributeTable', cannabisRetailName);
    //                 } else {
    //                   cancelSpinner()
    //                   var bodyDisplayStr = 'Please try again';
    //                   var titleDisplayStr = 'No Results For ' + searchStr;
    //                   UICtrl.displayModal(titleDisplayStr, bodyDisplayStr);
    //                 }
    //               })
    //               .catch(function (err) {
    //                 alert('An unknown error has occured. Please try again later');
    //               });
    //           }
    //         })
    //     }
    //   })
    // }

    // function isSmallView() {
    //   var windowWidth = window.innerWidth;
    //   console.log(windowWidth)
    //   return windowWidth < 992 ?  true : false;
    // }

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
          return Promise.reject('');
        } else {
          searchByAddressInGISData(searchStr).then(function (searchByAddressSuccess) {
            console.log('search by address success: ', searchByAddressSuccess);
            if (!searchByAddressSuccess) {
              searchByNameInGISData(searchStr).then(function (searchByNameSuccess) {
                console.log('now searching by name in gis data');
                if (searchByNameSuccess) {
                  return Promise.reject('');
                } else {
                  var bodyDisplayStr = 'Please try again';
                  var titleDisplayStr = 'No Results For ' + searchStr;
                  UICtrl.displayModal(titleDisplayStr, bodyDisplayStr);
                }
              });
            }
          });
        }
      });
    }

    function listenForEvents() {
      var uiSelectors = UICtrl.getUiSelectors();

      // submit search box
      $(uiSelectors.searchBox).submit(function (event) {
        callLoadSpinner()
        event.preventDefault();
        var searchString = $('#addressInput').val();
        handleSearching(searchString)

      });


      document.addEventListener('click', function (event) {
        var MULTIPLE_BUSINESS_SELECTION_CLASS = 'multiple-business-selection';
        var clickedType = event.target.type;
        var currClassName = event.target.className;
        var clickedItemTextContent = event.target.textContent;
        var clickedBusinessName = clickedItemTextContent.split(':')[0];
        var clickedBusinessAddress = clickedItemTextContent.split(':')[1];
        var parentElement = event.target.parentElement;
        var parentElementClassName = parentElement.className;

        if (currClassName.indexOf('btn-search') !== -1 || currClassName.indexOf('fa-search') !== -1 || currClassName.indexOf('input-group-append') !== -1) {
          var searchStr = $('#addressInput').val();
          handleSearching(searchStr);
        }
        
        var clickedOnClosePopUp = currClassName.indexOf('esri-icon-close')

        if (currClassName.indexOf('esri-popup__button esri-popup__feature-menu-button') !== -1) {
          // console.log('you clicked me!');
          var popupContent = $('.esri-popup__content');
          if (popupContent.height() !== 0)  {
            $('.esri-popup__pagination-previous').css({'margin-left': '30px'});
            $('.esri-popup__pagination-next').css({'margin-right': '30px'});
            // $('.esri-popup__main-container').css({'border-top-right-radius': '0px', 'border-top-left-radius': '0px'})
          } else {
            $('.esri-popup__pagination-previous').css({'margin-left': '0px'});
            $('.esri-popup__pagination-next').css({'margin-right': '0px'});
            // $('.esri-popup__main-container').css({'border-top-right-radius': '8px', 'border-top-left-radius': '8px'})
          }
        }

        // esri-popup__feature-menu-item--selected 
        // console.log(currClassName)
        var clickedOnListItemInPopup = currClassName.indexOf('esri-popup__feature-menu-item') !== -1 || currClassName.indexOf('esri-popup__feature-menu-title') !== -1 || currClassName.indexOf('esri-icon-check-mark') !== -1 || currClassName.indexOf('esri-popup__feature-menu-title') !== -1 || parentElementClassName.indexOf('esri-popup__feature-menu-title') !== -1;
        if (clickedOnListItemInPopup) {
          $('.esri-popup__main-container').css({'border-top-right-radius': '8px', 'border-top-left-radius': '8px'})
          // console.log('clicked on item')
          $('.esri-popup__pagination-previous').css({'margin-left': '0px'});
          $('.esri-popup__pagination-next').css({'margin-right': '0px'});
        }

        // 16f4876c154-widget-0-popup-content

        // User has selected on a choice at this point
        if ((currClassName.indexOf(MULTIPLE_BUSINESS_SELECTION_CLASS) !== -1) && (parentElementClassName === 'messi-button-container')) {
          var currIDName = parentElement.id;
          var searchType = 'findByExactMatch'
          MapCtrl.searchByNameInAttributeTable(clickedBusinessName, clickedBusinessAddress, searchType, currIDName)
            .then(function (response) {
              // console.log(response)
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
        if (clickedType === 'checkbox') {
          MapCtrl.updateLayerVisibility(event)
        }

        
      })

    }

    return {
      isOnMobile: function () {
        var windowWidth = window.innerWidth;
        return windowWidth < 544 ? true : false;
      },
      init: function () {
        $(document).ready(function () {
          listenForEvents();
          UICtrl.listenForScrollingForLocationMenu();
          UICtrl.listenForScrollingForLegendMenu();
          UICtrl.listenForMobileAlert();
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
  $('#locations-logo').attr('src', 'images/Location.svg')
}

function showFilterOnMobileTab() {
  $('#mobile-legend').css('display', 'none');
  $('#filter-container').css('display', 'block');
  $('#locations-logo').attr('src', 'images/Location-active.svg')
  $('#legend-logo').attr('src', 'images/legend.svg');
}