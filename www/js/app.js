
'use strict';

// TODO: remove this temp hack once login is in place
var currentUser = {
  _id: '-=DEBUG_USER=-'
};

var nestClientId      = "829579eb-682c-4e44-b69b-d40df3ad9ab2";
var nestClientSecret  = "OvjjBj81jV8JFSTE5swkhXjwA";

var rootRef  = firebase.database().ref();

angular.module('starter', ['firebase', 'ionic', 'ionic.cloud', 'ionic-material', 'ionMdInput', 'ngCordova', 'ui.router'])


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
    if(window.StatusBar && cordova.platformId == 'android') {
      StatusBar.backgroundColorByHexString( '#33B8B5' );
    }
  });
})


.controller( 'AppCtrl', function( $ionicDeploy, $ionicPlatform, $ionicPopup, $scope ) {

  var Datagram;
  var socket;
  
  $ionicPlatform.ready(function() {

    if ( !window.cordova )  return;
    
    Datagram  = cordova.require( 'cordova-plugin-dgram.dgram' );
    socket    = Datagram.createSocket( 'udp4', 25000 );
    
    socket.bind(function (error, port) {
      if (error !== null) {
        console.log(error, port);
      }

      // PORT:  OK          <- initial run
      // PORT:  undefined   <- after 'hot' reload
      // Object {error: "java.net.BindException: bind failed: EADDRINUSE (Address already in use)", stacktrace: "java.net.BindException: bind failed: EADDRINUSE (A….io.IoBridge.bind(IoBridge.java:97)↵	... 12 more↵"}
      console.log( 'PORT: ', port );
    });
    
    socket.on('message', function (message, remoteAddress) {
      if (message.length > 0) {
        // process response message
        console.log( message, remoteAddress );
      }
    });

  })
  
  $scope.BroadcastMessage = function( text ) {
    console.log( 'UDP MESSAGE: ', text );
    // socket.send( text, '255.255.255.255', 25000 );
    socket.send( text, '230.185.192.108', 25000 );
  }
  
  $scope.clearFabs = function() {
      var fabs = document.getElementsByClassName('button-fab');
      if (fabs.length && fabs.length > 1) {
          fabs[0].remove();
      }
  }
  
  $scope.hideHeader = function() {
      $scope.hideNavBar();
      $scope.noHeader();
  }
  
  $scope.hideNavBar = function() {
      document.getElementsByTagName('ion-nav-bar')[0].style.display = 'none';
  }

  $scope.noHeader = function() {
      var content = document.getElementsByTagName('ion-content');
      for (var i = 0; i < content.length; i++) {
          if (content[i].classList.contains('has-header')) {
              content[i].classList.toggle('has-header');
          }
      }
  }

  $ionicDeploy.check().then(function(snapshotAvailable) {
    if (snapshotAvailable) {
      // When snapshotAvailable is true, you can apply the snapshot
      $ionicDeploy.download().then(() => {
        return $ionicDeploy.extract().then(() => {
          $ionicPopup.show({
            title: 'Update complete',
            subTitle: 'Restart app now?',
            buttons: [
              {
                text: '<b>Now</b>',
                type: 'button-assertive',
                onTap: () => {
                  // restart app
                  $ionicDeploy.load();
                }
              },
              { text: 'Later' }
            ]
          });
        })
      });
    }
  });
})


.controller( 'DashboardCtrl', function( $http, $scope, $timeout, ionicMaterialMotion ) {
  
  $http.get( '/000780153CB2.json' ).then(function( resp ) {
    $scope.sensorHubRealtime            = resp.data.sensorHubs;
    $scope.latestNetworkHubPowerSource  = resp.data.latestPowerStatus;
    $scope.latestNetworkHubRssi         = resp.data.latestRssi;

    $timeout(function() {
      ionicMaterialMotion.fadeSlideInRight({ selector: '.card' });
    }, 13);
  })
})


.controller( 'DeviceCategoriesCtrl', function( $firebaseArray, $scope, $timeout, ionicMaterialMotion ) {
  
  $scope.devices            = $firebaseArray( rootRef.child( 'devices' ).orderByChild( 'category' ) );
  
  $scope.devices.$loaded().then(function() {
    $scope.devicesByCategory  = _.groupBy( $scope.devices, 'category' );

    $timeout(function() {
      ionicMaterialMotion.fadeSlideInRight();
    }, 0);
  })

  $scope.deviceManufacturers  = function( devices ) {
    return _.uniq( devices.map( d => d.manufacturer ) ).join( ', ' );
  }
})


.controller( 'DevicesCtrl', function( $firebaseArray, $scope, $stateParams, $timeout, ionicMaterialMotion ) {
  $scope.category   = $stateParams.category;
  
  // TODO: does this need alpha sort?  -  orderByChild( 'title' )
  $scope.devices    = $firebaseArray( rootRef.child( 'devices' ) );

  $scope.devices.$loaded().then(function( data ) {
    $timeout(function() {
      ionicMaterialMotion.fadeSlideInRight();
    }, 0);
  })

  $scope.verificationPage = function ( device ) {
    return [ device.manufacturer, device.title ].join( '-' ).replace( /\s/g, '-' ).toLowerCase();
  }
})


.controller('LoginCtrl', function( $ionicHistory, $scope, $timeout, $state, $stateParams, ionicMaterialInk ) {
    
    $ionicHistory.nextViewOptions({
        historyRoot: true
    });
    
    $scope.userInput  = {};
    
    $scope.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('login-button', {
      'size': 'invisible',
      'callback': function(response) {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        $scope.onSignInSubmit();
      }
    });

    $scope.recaptchaVerifier.render().then(function(widgetId) {
      $scope.recaptchaWidgetId = widgetId;
    });

    $scope.onSignInSubmit = function() {

      console.log( '.. onSignInSubmit' );

      firebase.auth().signInWithPhoneNumber( $scope.userInput.phoneNumber, $scope.recaptchaVerifier )
        .then(function( confirmationResult ) {
          $scope.confirmationResult = confirmationResult;

          document.getElementById( 'login-form' ).style.display = 'none';
          document.getElementById( 'verification-code-form' ).style.display = 'block';
        })

      // console.log( $scope.userInput.phoneNumber );

      // window.FirebasePlugin.verifyPhoneNumber( $scope.userInput.phoneNumber, 0, function( credential ) {
      //   console.log( 'verifyPhoneNumber COMPLETE' );
      //   console.log( credential );
      //   $scope.verificationId = credential.verificationId;

      //   document.getElementById( 'login-form' ).style.display = 'none';
      //   document.getElementById( 'verification-code-form' ).style.display = 'block';
      // }, function( err ) {
      //   console.log( 'BOOM' );
      //   console.log( err );
      // });
    }
    
    $scope.onVerifyCodeSubmit = function() {
      $scope.confirmationResult.confirm( $scope.userInput.verificationCode ).then(function( result ) {
        $state.go( 'app.devices' );
        document.getElementsByTagName('ion-nav-bar')[0].style.display = 'block';
      })
      // var signInCredential = firebase.auth.PhoneAuthProvider.credential(
      //   $scope.verificationId,
      //   $scope.userInput.verificationCode
      // );
      
      // firebase.auth().signInWithCredential( signInCredential )
      //   .then(function( credential ) {
      //     console.log( credential );
      //     $state.go( 'app.devices' );
      //     document.getElementsByTagName('ion-nav-bar')[0].style.display = 'block';
      //   })
    }

    $scope.$parent.clearFabs();
    $timeout(function() {
        $scope.$parent.hideHeader();
    }, 0);
    ionicMaterialInk.displayEffect();
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
            return alert( errorText );
          }
          
          if ( hueResp.data[0] && hueResp.data[0].success ) {
            var hueUsername = hueResp.data[0].success.username;
            
            $http.get(hueInternalApiUrl+hueUsername, {}).then(function( fullStateResp ) {
              alert( 'Found ' + Object.keys(fullStateResp.data.lights).length + ' lights with ' + Object.keys( fullStateResp.data.schedules ).length + ' schedules');
              
              fullStateResp.data.verifyDate = new Date().getTime();
              // if (LatestGpsCoordinates.get())  fullStateResp.data.verifiedFromGpsPosition = LatestGpsCoordinates.get();
              
              rootRef.child( 'verifiedThirdPartyDevices' ).child( currentUser._id ).update( { phillipsHue: fullStateResp.data } );
            })
          }
        })
      } else {
        alert( "No bridge found.  Please ensure you're connected to the same Wi-Fi network." );
      }
    })
  }
})


.controller( 'VerifyNestCtrl', function( $cordovaInAppBrowser, $http, $ionicPopup, $location, $rootScope, $scope ) {
  
  $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
  
  $scope.login = function() {

        var options = {
          location    : 'no',
          clearcache  : 'yes',
          toolbar     : 'no'
        };
        
        $cordovaInAppBrowser.open( 'https://home.nest.com/login/oauth2?client_id=829579eb-682c-4e44-b69b-d40df3ad9ab2&state=' + new Date().getTime(), '_blank', options );
        
        $scope.getCodeFromUrl = function( e, event ) { 
            if((event.url).startsWith( 'https://homeclub.us/auth/nest/callback' )) {
                let requestToken  = event.url.split( 'code=' )[1];
                
                $http({method: "post", url: "https://api.home.nest.com/oauth2/access_token", data: "client_id=" + nestClientId + "&client_secret=" + nestClientSecret + "&grant_type=authorization_code" + "&code=" + requestToken })
                    .success(function( data ) {
                      let accessToken = data.access_token;
                      
                      var ref = new Firebase( 'wss://developer-api.nest.com' );
                      ref.auth( accessToken );
                      ref.on('value', function( snapshot ) {
                        var nestData = {
                          devices     : snapshot.val().devices,
                          verifyDate  : new Date().getTime()
                        }
                        
                        // if (LatestGpsCoordinates.get())  nestData.verifiedFromGpsPosition = LatestGpsCoordinates.get();
                        
                        rootRef.child( 'verifiedThirdPartyDevices' ).child( currentUser._id ).update( { nest: nestData } );

                        $ionicPopup.alert({
                          title: 'Nest devices verified!'
                        });
                      });
                    })
                    .error(function( data, status ) {
                      alert("ERROR: " + data);
                    });

                $cordovaInAppBrowser.close();
            }
        }

        $rootScope.$on( '$cordovaInAppBrowser:loadstart', $scope.getCodeFromUrl );
        $rootScope.$on( '$cordovaInAppBrowser:loaderror', $scope.getCodeFromUrl );
    }
    
    if ( typeof String.prototype.startsWith != 'function' ) {
        String.prototype.startsWith = function ( str ){
            return this.indexOf( str ) == 0;
        };
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
  
  .state('app.dashboard', {
    url: '/dashboard',
    views: {
      'menuContent': {
        templateUrl: 'templates/dashboard.html',
        controller: 'DashboardCtrl'
      }
    }
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

  .state('app.verifyNest', {
    url: '/verify/nest-nest-learning-thermostat',
    views: {
      'menuContent': {
        templateUrl: 'templates/verify/nest-nest-learning-thermostat.html',
        controller: 'VerifyNestCtrl'
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
  
  .state('app.login', {
    url: '/login',
    views: {
      'menuContent': {
        templateUrl: 'templates/login.html',
        controller: 'LoginCtrl'
      }
    }
  })

  $urlRouterProvider.otherwise('/app/login');
});