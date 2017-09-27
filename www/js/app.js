
'use strict';

// TODO: remove this temp hack once login is in place
var currentUser = {
  uid: '-=DEBUG_USER=-'
};

var nestClientId      = "829579eb-682c-4e44-b69b-d40df3ad9ab2";
var nestClientSecret  = "OvjjBj81jV8JFSTE5swkhXjwA";

var rootRef  = firebase.database().ref();

function getBase64ImageFromInput(input, callback) {
  window.resolveLocalFileSystemURL(input, function(fileEntry) {
      fileEntry.file(function(file) {
              var reader = new FileReader();
              reader.onloadend = function(evt) {
                  callback(null, evt.target.result);
              };
              reader.readAsDataURL(file);
          },
          function() {
              callback('failed', null);
          });
  },
  function() {
      callback('failed', null);
  });
}


angular.module('starter', [
  'firebase',
  'ionic',
  'ionic.cloud',
  'ionic-material',
  'ionMdInput',
  'ngCordova',
  'toastr',
  'ui.router'
])


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


.factory('LatestGpsCoordinates', function() {
  
  var position = {};
  
  return {
    get: function() { return position.coords },
    set: function( coords ) { position.coords = {
      latitude: coords.latitude,
      longitude: coords.longitude
    } }
  };
  
})


.factory('SessionFactory', function($window, $ionicPlatform, $timeout) {
    var _sessionFactory;
    _sessionFactory = {};
    _sessionFactory.createSession = function(user) {
      return $window.localStorage.user = JSON.stringify(user);
    };
    _sessionFactory.getSession = function() {
      var user  = $window.localStorage.user;
      return user && JSON.parse( user ) || undefined;
    };
    _sessionFactory.deleteSession = function() {
      delete $window.localStorage.user;
      return true;
    };
    _sessionFactory.checkSession = function() {
      if ($window.localStorage.user) {
        return true;
      }
      return false;
    };
    return _sessionFactory;
  })


.directive('stopEvent', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attr) {
      element.bind('click', function (e) {
        e.stopPropagation();
      });
    }
  };
})


.controller( 'AppCtrl', function(
  $cordovaGeolocation,
  $cordovaInAppBrowser,
  $firebaseAuth,
  $ionicDeploy,
  $ionicPlatform,
  $ionicPopup,
  $scope,
  $state,
  LatestGpsCoordinates,
  SessionFactory,
  toastr
) {

  // get GPS location on app start
  $cordovaGeolocation.getCurrentPosition({}).then(function(position){
    LatestGpsCoordinates.set( position.coords );
  },function( err ){ console.log( err ) });
  
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
  
  // $scope.clearFabs = function() {
  //     var fabs = document.getElementsByClassName('button-fab');
  //     if (fabs.length && fabs.length > 1) {
  //         fabs[0].remove();
  //     }
  // }
  
  $scope.hideHeader = function() {
      $scope.hideNavBar();
      $scope.noHeader();
  }
    
  $scope.showHeader = function() {
      $scope.showNavBar();
      $scope.addHeader();
  }
  
  $scope.hideNavBar = function() {
    document.getElementsByTagName('ion-nav-bar')[0].style.display = 'none';
  }
    
  $scope.showNavBar = function() {
    document.getElementsByTagName('ion-nav-bar')[0].style.display = 'block';
  }

  $scope.logout   = function() {

    $firebaseAuth().$signOut().then(() => {
      // delete persisted user from localStorage
      SessionFactory.deleteSession();

      // TODO: hook this into event listener
      $state.go( 'app.login' );
    })
  }

  var options = {
      location    : 'no',
      clearcache  : 'yes',
      toolbar     : 'no'
    };

  $scope.openStore  = function() {
    $cordovaInAppBrowser.open( 'https://homeclub.us', '_blank', options );
  }
   
  $scope.noHeader = function() {
      var content = document.getElementsByTagName('ion-content');
      for (var i = 0; i < content.length; i++) {
          if ( content[i].classList.contains('has-header') ) {
              content[i].classList.toggle( 'has-header' );
          }
      }
    }
    
  $scope.addHeader = function() {
      var content = document.getElementsByTagName('ion-content');
      for (var i = 0; i < content.length; i++) {
          if ( !content[i].classList.contains('has-header') ) {
              content[i].classList.toggle( 'has-header' );
          }
      }
  }

  $scope.checkingForUpdate  = false;
  
  $scope.checkForUpdate = function( suppressInitialAlert ) {

    // console.log( 'CHECKING FOR UPDATE' );
    if ( !suppressInitialAlert )  toastr.info( '', 'Checking for update' );

    $scope.checkingForUpdate  = true;

    $ionicDeploy.check().then(function(snapshotAvailable) {

      $scope.checkingForUpdate  = false;

      if (snapshotAvailable) {
        toastr.info( '.. downloading update' );
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
      } else {
        toastr.warning( '.. no update available' );
      }
    });
  }

  $scope.checkForUpdate( true );

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


.controller( 'DeviceCategoriesCtrl', function(
  $firebaseArray,
  $ionicSideMenuDelegate,
  $scope,
  $timeout,
  ionicMaterialMotion
) {
  
  $ionicSideMenuDelegate.canDragContent( true );
  
  $scope.devices            = $firebaseArray( rootRef.child( 'devices' ).orderByChild( 'category' ) );
  
  $scope.devices.$loaded().then(function() {
    // $scope.$parent.showHeader();

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
    return  device.verifyPage ||
            [ device.manufacturer, device.title ].join( '-' ).replace( /\s|\//g, '-' ).toLowerCase();
  }
})


.controller('LoginCtrl', function(
  $cordovaInAppBrowser,
  $firebaseAuth,
  $firebaseObject,
  $ionicHistory,
  $ionicPopup,
  $ionicSideMenuDelegate,
  $scope,
  $timeout,
  $state,
  SessionFactory,
  toastr
) {

    $ionicHistory.nextViewOptions({
      disableBack: true
    });

    $scope.states   = {
      "AL": "Alabama",
      "AK": "Alaska",
      "AZ": "Arizona",
      "AR": "Arkansas",
      "CA": "California",
      "CO": "Colorado",
      "CT": "Connecticut",
      "DE": "Delaware",
      "DC": "District Of Columbia",
      "FL": "Florida",
      "GA": "Georgia",
      "HI": "Hawaii",
      "ID": "Idaho",
      "IL": "Illinois",
      "IN": "Indiana",
      "IA": "Iowa",
      "KS": "Kansas",
      "KY": "Kentucky",
      "LA": "Louisiana",
      "ME": "Maine",
      "MD": "Maryland",
      "MA": "Massachusetts",
      "MI": "Michigan",
      "MN": "Minnesota",
      "MS": "Mississippi",
      "MO": "Missouri",
      "MT": "Montana",
      "NE": "Nebraska",
      "NV": "Nevada",
      "NH": "New Hampshire",
      "NJ": "New Jersey",
      "NM": "New Mexico",
      "NY": "New York",
      "NC": "North Carolina",
      "ND": "North Dakota",
      "OH": "Ohio",
      "OK": "Oklahoma",
      "OR": "Oregon",
      "PW": "Palau",
      "PA": "Pennsylvania",
      "RI": "Rhode Island",
      "SC": "South Carolina",
      "SD": "South Dakota",
      "TN": "Tennessee",
      "TX": "Texas",
      "UT": "Utah",
      "VT": "Vermont",
      "VA": "Virginia",
      "WA": "Washington",
      "WV": "West Virginia",
      "WI": "Wisconsin",
      "WY": "Wyoming"
  }

    $scope.$on('$ionicView.enter', function () {
      $timeout(function() {
        $scope.$parent.hideHeader();
      }, 13);
    });

    $scope.$on('$ionicView.unloaded', function () {
      $scope.$parent.showHeader();
    });
    
    var loggedInUser  = SessionFactory.getSession();
    
    // if user already logged in skip to device categories page
    if ( loggedInUser ) {
      currentUser = loggedInUser;

      $scope.currentUserMeta = $firebaseObject( rootRef.child( 'users' ).child( currentUser.uid ) );

      // wait till user meta is loaded
      // then show welcome back toast
      $scope.currentUserMeta.$loaded().then(function( data ) {
        $state.go( 'app.deviceCategories' );
        var name  = $scope.currentUserMeta.name && $scope.currentUserMeta.name.first || ''
        toastr.info( 'Welcome back ' + name );
      })
    }

    var options = {
      location    : 'no',
      clearcache  : 'yes',
      toolbar     : 'no'
    };

    $scope.openPrivacy  = function() {
      $cordovaInAppBrowser.open( 'https://homeclub.us/17264631/policies/38419791.html', '_blank', options );
    };
    
    $scope.openTerms  = function() {
      $cordovaInAppBrowser.open( 'https://homeclub.us/17264631/policies/38419855.html', '_blank', options );
    };
    
    $ionicSideMenuDelegate.canDragContent( false );
    
    $scope.user     = {};

    $scope.sendPasswordReset      = function() {
      
      if ( !$scope.user.email )  return $ionicPopup.alert( { title: 'Enter email first' } );
      
      let errorMessage  = {
        title     : 'Invalid email',
        subTitle  : 'Please verify your email'
      }
      
      let successMessage  = {
        title     : 'Password reset sent!',
        subTitle  : 'Please check your email'
      }

      $firebaseAuth().$sendPasswordResetEmail( $scope.user.email )
        .then(() => $ionicPopup.alert( successMessage ))
        .catch(( err ) => {
          $ionicPopup.alert( errorMessage );
        });

    }

    $scope.updateFirebaseProfile  = function() {

      rootRef.child( 'users' )
            .child( currentUser.uid )
            .update( $scope.user )
            .then(() => {
              currentUser = _.extend( currentUser, $scope.user );

              // persist currentUser (till logout)
              SessionFactory.createSession( currentUser );

              $state.go( 'app.deviceCategories' );
            });

    }
    
    $scope.onSubmit = function() {
      $firebaseAuth().$signInWithEmailAndPassword(
        $scope.user.email,
        $scope.user.password
      )
        .then(( user ) => {
          currentUser = user.toJSON();

          // persist currentUser (till logout)
          SessionFactory.createSession( currentUser );

          $state.go( 'app.deviceCategories' );
        }, function( err ) {
          toastr.warning( err.message );
        });
    };

    $scope.createUser  = function() {
      $firebaseAuth().$createUserWithEmailAndPassword(
        $scope.user.email,
        $scope.user.password
      ).then(( user ) => {

        // login user then navigate to create your account page
        $firebaseAuth().$signInWithEmailAndPassword(
          $scope.user.email,
          $scope.user.password
        )
          .then(( user ) => {
            currentUser = user.toJSON();

            // * DONT create session or profile page
            // - which uses LoginCtrl will auto-bypass the profile page
            // SessionFactory.createSession( currentUser );

            $state.go( 'app.register' );
          });

      }, function ( error ){
        console.log( error );
        toastr.warning( error.message );
      })
    };

    // $timeout(function() {
    //     $scope.$parent.hideHeader();
    // }, 0);
})


.controller('ProfileCtrl', function(
  $ionicHistory,
  $scope,
  $state,
  $timeout,
  SessionFactory,
  toastr
) {

  $ionicHistory.nextViewOptions({
    disableBack: true
  });

  $scope.states   = {
      "AL": "Alabama",
      "AK": "Alaska",
      "AZ": "Arizona",
      "AR": "Arkansas",
      "CA": "California",
      "CO": "Colorado",
      "CT": "Connecticut",
      "DE": "Delaware",
      "DC": "District Of Columbia",
      "FL": "Florida",
      "GA": "Georgia",
      "HI": "Hawaii",
      "ID": "Idaho",
      "IL": "Illinois",
      "IN": "Indiana",
      "IA": "Iowa",
      "KS": "Kansas",
      "KY": "Kentucky",
      "LA": "Louisiana",
      "ME": "Maine",
      "MD": "Maryland",
      "MA": "Massachusetts",
      "MI": "Michigan",
      "MN": "Minnesota",
      "MS": "Mississippi",
      "MO": "Missouri",
      "MT": "Montana",
      "NE": "Nebraska",
      "NV": "Nevada",
      "NH": "New Hampshire",
      "NJ": "New Jersey",
      "NM": "New Mexico",
      "NY": "New York",
      "NC": "North Carolina",
      "ND": "North Dakota",
      "OH": "Ohio",
      "OK": "Oklahoma",
      "OR": "Oregon",
      "PW": "Palau",
      "PA": "Pennsylvania",
      "RI": "Rhode Island",
      "SC": "South Carolina",
      "SD": "South Dakota",
      "TN": "Tennessee",
      "TX": "Texas",
      "UT": "Utah",
      "VT": "Vermont",
      "VA": "Virginia",
      "WA": "Washington",
      "WV": "West Virginia",
      "WI": "Wisconsin",
      "WY": "Wyoming"
  }

  // window.addEventListener('native.keyboardshow', keyboardShowHandler);

  // function keyboardShowHandler(e){
  //     alert('Keyboard height is: ' + e.keyboardHeight);
  // }
  
  $scope.$parent.hideHeader();
  
  // TODO: on view leave showHeader()
  $scope.$on('$ionicView.unloaded', function () {
    $scope.$parent.showHeader();
  });

  $scope.user = SessionFactory.getSession();

  console.log( $scope.user );

  // $scope.userDetails  = rootRef.child( 'users' )
  //           .child( currentUser.uid );
  $scope.userDetailsRef   = rootRef.child( 'users' )
            .child( $scope.user.uid );
    
  // $scope.userDetails    = $firebaseObject( $scope.userDetailsRef );
  $scope.userDetails    = {
    name: {
      first : 'First name',
      last  : 'Last name'
    }
  };


  $scope.userDetailsRef.once('value', function( snapshot ) {
    let userDetails = snapshot.val();

    if ( userDetails.name !== null ) {
      $scope.userDetails    = userDetails;
    }
  })

  $scope.cancel = function() {
    $state.go( 'app.deviceCategories' );
  }
  
  $scope.save = function() {

    $scope.userDetailsRef.update(
      $scope.userDetails,
      () => {
        let originalUser  = SessionFactory.getSession();

        let firebaseProfileUpdate = {};

        // email has to be updated by specific firebase method
        // if ( $scope.user.email != originalUser.email )  firebaseProfileUpdate.email = $scope.user.email;

        if ( $scope.user.phoneNumber != originalUser.phoneNumber )  firebaseProfileUpdate.phoneNumber = $scope.user.phoneNumber;

        if ( Object.keys( firebaseProfileUpdate ).length ) {
          var user = firebase.auth().currentUser;

          user.updateProfile( firebaseProfileUpdate ).then(function() {
            // save changes to SessionFactory (localstorage)
            let updatedUser = angular.extend( originalUser, firebaseProfileUpdate );
            SessionFactory.createSession( updatedUser );

            // Update successful.
            toastr.success( '', 'Saved!' );
            $state.go( 'app.deviceCategories' );
          }).catch(function(error) {
            // An error happened.
          });
        } else {
          toastr.success( '', 'Saved!' );
          $state.go( 'app.deviceCategories' );
        }
      }
    )
  }

})



.controller('VerifyUnknownDeviceCtrl', function( $cordovaCapture, $stateParams, $scope, LatestGpsCoordinates ) {

  $scope.deviceTitle  = $stateParams.deviceTitle
    .replace( /^\w*-/, '' )
    .replace( /-/g, ' ' );

  $scope.takePicture  = function() {
    $cordovaCapture.captureImage().then(function( imageData ) {
      getBase64ImageFromInput(
        imageData[0].fullPath,
        function( err, base64Img ) {
          
          var verificationData  = {
            evidencePhoto : base64Img,
            verifyDate    : new Date().getTime()
          }

          if (LatestGpsCoordinates.get())  verificationData.verifiedFromGpsPosition = LatestGpsCoordinates.get();
          
          rootRef.child( 'verifiedThirdPartyDevices' )
            .child( currentUser.uid )
            .child( $scope.deviceTitle.replace( /\s/g, '-' ) )
            .update( verificationData );
          
          storageRef
            .child( 'verifiedThirdPartyDevices' )
            .child( currentUser.uid )
            .child( $stateParams.deviceTitle + '.' + imageData[0].name.split( '.' )[1] )
            .putString( base64Img, 'data_url' ).then(function( snapshot ) {
              console.log('Uploaded a data_url string!');
            });

            // TODO: after storageRef putString callback success toast
        },
        function( err ) {}
      );
      
    }, function( err ) {
      // An error occurred. Show a message to the user
    });
  }
  
})


.controller('VerifyHueCtrl', function(
  $scope,
  $http,
  $state,
  $window,
  LatestGpsCoordinates,
  toastr
) {

  $scope.findBridge = function() {
    $http.get('https://www.meethue.com/api/nupnp', {}).then(function(resp){
      
      var hueInternalIp = resp.data[0] && resp.data[0].internalipaddress;
      if ( hueInternalIp ) {
        
        var hueInternalApiUrl = 'http://' + hueInternalIp + '/api/';
        
        $http.post( hueInternalApiUrl, {devicetype:"homeclub_connect#mobile testuser"} ).then(function( hueResp ) {
          
          if ( hueResp.data[0] && hueResp.data[0].error ) {
            var errorText = hueResp.data[0].error.description;
            var errorText = errorText.charAt(0).toUpperCase() + errorText.substr(1).toLowerCase();
            // return alert( errorText );
            return toastr.warning( errorText );
          }
          
          if ( hueResp.data[0] && hueResp.data[0].success ) {
            var hueUsername = hueResp.data[0].success.username;
            
            $http.get(hueInternalApiUrl+hueUsername, {}).then(function( fullStateResp ) {
              
              let successTitle    = 'Verified!';
              let successText     = 'Found ' + Object.keys(fullStateResp.data.lights).length + ' lights with ' + Object.keys( fullStateResp.data.schedules ).length + ' schedules';
              
              // alert( successText );
              
              fullStateResp.data.verifyDate = new Date().getTime();
              if (LatestGpsCoordinates.get())  fullStateResp.data.verifiedFromGpsPosition = LatestGpsCoordinates.get();
              
              rootRef.child( 'verifiedThirdPartyDevices' ).child( currentUser.uid ).update(
                { 'philips-hue': fullStateResp.data },
                () => {
                  toastr.success( successText, successTitle );
                  $state.go( 'app.deviceCategories' );
                }
              );
            })
          }
        })
      } else {
        alert( "No bridge found.  Please ensure you're connected to the same Wi-Fi network." );
      }
    })
  }
})


.controller( 'VerifyNestCtrl', function(
  $cordovaInAppBrowser,
  $http,
  $ionicPopup,
  $location,
  $rootScope,
  $scope,
  LatestGpsCoordinates
) {
  
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
                        
                        if (LatestGpsCoordinates.get())  nestData.verifiedFromGpsPosition = LatestGpsCoordinates.get();
                        
                        rootRef.child( 'verifiedThirdPartyDevices' ).child( currentUser.uid ).update(
                          { nest: nestData },
                          () => toastr.success( '', 'Verified!' )
                        );

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
      // return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
      return (!!input) ? input.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()}) : '';
    }
})


.filter('humanize', function() {
    return function( input ) {
      return (!!input) ? input.replace( /_/g, ' ' ) : '';
    }
})


.config(function(
  $ionicCloudProvider,
  $ionicConfigProvider,
  $stateProvider,
  $urlRouterProvider
) {
  
  $ionicConfigProvider.tabs.position( 'bottom' );
  
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

  .state('app.verifyEcho', {
    url: '/verify/amazon-echo',
    views: {
      'menuContent': {
        templateUrl: 'templates/verify/amazon-echo.html'//,
        // controller: 'VerifyNestCtrl'
      }
    }
  })

  .state('app.verifyLeeo', {
    url: '/verify/leeo-leeo-smart-alert-smoke-co-remote-alarm-monitor',
    views: {
      'menuContent': {
        templateUrl: 'templates/verify/leeo-leeo-smart-alert-smoke-co-remote-alarm-monitor.html'//,
        // controller: 'VerifyNestCtrl'
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
        // template: '<ion-view><ion-content><h3 class="padding">Verification coming soon!</h3></ion-view></ion-content>'
        controller: 'VerifyUnknownDeviceCtrl',
        templateUrl: 'templates/verify/unknown-device.html'
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

  .state('app.profile', {
    url: '/profile',
    views: {
      'menuContent': {
        templateUrl : 'templates/profile2.html',
        controller  : 'ProfileCtrl'
      }
    }
  })

  .state('app.register', {
    url: '/register',
    views: {
      'menuContent': {
        templateUrl: 'templates/register-your-account.html',
        controller: 'LoginCtrl'
      }
    }
  })

  $urlRouterProvider.otherwise('/app/login');
});