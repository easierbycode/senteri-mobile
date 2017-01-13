
'use strict';

var rootRef  = firebase.database().ref();


angular.module('starter', ['firebase', 'ionic', 'ionic.cloud', 'ionic-material', 'ui.router'])


.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})


.controller( 'AppCtrl', function( $ionicDeploy, $ionicPopup, $scope ) {
  $ionicDeploy.check().then(function(snapshotAvailable) {
    if (snapshotAvailable) {
      // When snapshotAvailable is true, you can apply the snapshot
      $ionicDeploy.download().then(function() {
        return $ionicDeploy.extract().then(function() {
          $scope.showPopup = function() {
            $ionicPopup.show({
              title: 'Update complete',
              subTitle: 'Restart app now?',
              buttons: [
                {
                  text: '<b>Now</b>',
                  type: 'button-assertive',
                  onTap: function() {
                    // restart app
                    $ionicDeploy.load();
                  }
                },
                { text: 'Later' }
              ]
            });
          };
        })
      });
    }
  });
})


.controller( 'DeviceCategoriesCtrl', function( $firebaseArray, $scope, $timeout, ionicMaterialMotion ) {
  
  $scope.devices            = $firebaseArray( rootRef.child( 'devices' ).orderByChild( 'category' ) );
  
  $scope.devices.$loaded().then(function() {
    $scope.devicesByCategory  = _.groupBy( $scope.devices, 'category' );

    $timeout(function() {
      ionicMaterialMotion.fadeSlideInRight();
    }, 13);
  })

  $scope.deviceManufacturers  = function( devices ) {
    return _.uniq( devices.map( d => d.manufacturer ) ).join( ', ' );
  }
})


.controller( 'DevicesCtrl', function( $firebaseArray, $scope, $stateParams, $timeout, ionicMaterialMotion ) {
  $scope.category   = $stateParams.category;
  $scope.devices    = $firebaseArray( rootRef.child( 'devices' ) );

  $scope.verificationPage = function ( device ) {
    return [ device.manufacturer, device.title ].join( '-' ).replace( /\s/g, '-' ).toLowerCase();
  }

  $timeout(function() {
    ionicMaterialMotion.fadeSlideInRight();
  }, 13);
})


.controller('VerifyHueCtrl', function($scope, $http, $window) {

  $scope.findBridge = function() {
    $http.get('https://www.meethue.com/api/nupnp', {}).then(function(resp){
      
      var hueInternalIp = resp.data[0] && resp.data[0].internalipaddress;
      if ( hueInternalIp ) {
        
        var hueInternalApiUrl = 'http://' + hueInternalIp + '/api/';
        
        $http.post( hueInternalApiUrl, {devicetype:"homeclub_connect#mobile testuser"} ).then(function( hueResp ) {
          
          if ( hueResp.data[0] && hueResp.data[0].error ) {
            var errorText = hueResp.data[0].error.description;
            return alert(errorText);
          }
          
          if ( hueResp.data[0] && hueResp.data[0].success ) {
            var hueUsername = hueResp.data[0].success.username;
            
            $http.get(hueInternalApiUrl+hueUsername, {}).then(function( fullStateResp ) {
              alert( 'Found ' + Object.keys(fullStateResp.data.lights).length + ' lights with ' + Object.keys( fullStateResp.data.schedules ).length + ' schedules');
              
              fullStateResp.data.verifyDate = new Date().getTime();
              // if (LatestGpsCoordinates.get())  fullStateResp.data.verifiedFromGpsPosition = LatestGpsCoordinates.get();
              
              // rootRef.child( currentUser._id ).child('thirdPartyDevices').update( {phillipsHue: fullStateResp.data} );
            })
          }
        })
      } else {
        alert( "No bridge found.  Please ensure you're connected to the same Wi-Fi network." );
      }
    })
  }
})


.filter('capitalize', function() {
    return function(input) {
      return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
})


.config(function( $ionicCloudProvider, $stateProvider, $urlRouterProvider ) {

  $ionicCloudProvider.init({
    "core": {
      "app_id": "eca18764"
    }
  });

  $stateProvider

  .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })

  .state('app.verifyHue', {
    url: '/verify/philips-hue',
    views: {
      'menuContent': {
        templateUrl: 'templates/verify/philips-hue.html',
        controller: 'VerifyHueCtrl'
      }
    }
  })

  .state('app.verifyPageDoesntExistYet', {
    url:  '/verify/:deviceTitle',
    views: {
      'menuContent': {
        template: '<ion-view><ion-content><h3 class="padding">Verification coming soon!</h3></ion-view></ion-content>'
      }
    }
  })
  
  .state('app.deviceCategories', {
    url: '/device-categories',
    views: {
      'menuContent': {
        templateUrl: 'templates/device-categories.html',
        controller: 'DeviceCategoriesCtrl'
      }
    }
  })

  .state('app.devices', {
    url: '/devices/:category',
    views: {
      'menuContent': {
        templateUrl: 'templates/devices.html',
        controller: 'DevicesCtrl'
      }
    }
  })

  $urlRouterProvider.otherwise('/app/device-categories');
});