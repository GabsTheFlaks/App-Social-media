
> social-pwa@0.0.0 lint
> eslint .


/app/social-pwa/src/components/Chat.jsx
  174:6  warning  React Hook useEffect has a missing dependency: 'fetchMessages'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/app/social-pwa/src/components/Feed.jsx
   35:6  warning  React Hook useCallback has a missing dependency: 'fetchPosts'. Either include it or remove the dependency array                     react-hooks/exhaustive-deps
  157:6  warning  React Hook useEffect has missing dependencies: 'fetchPosts' and 'fetchProfile'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/app/social-pwa/src/components/Network.jsx
  52:6  warning  React Hook useEffect has a missing dependency: 'fetchData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/app/social-pwa/src/components/Notifications.jsx
  64:6  warning  React Hook useEffect has a missing dependency: 'fetchNotifications'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/app/social-pwa/src/components/Profile.jsx
   93:6  warning  React Hook useEffect has a missing dependency: 'fetchSavedPosts'. Either include it or remove the dependency array                          react-hooks/exhaustive-deps
  189:6  warning  React Hook useEffect has missing dependencies: 'fetchProfileData' and 'fetchUserPosts'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/app/social-pwa/src/hooks/useStorageUpload.js
  16:6   warning  React Hook useEffect has a missing dependency: 'cancel'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  80:15  error    'data' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u                       no-unused-vars
  98:10  warning  Unexpected console statement. Only these console methods are allowed: warn, error                          no-console

✖ 10 problems (1 error, 9 warnings)
