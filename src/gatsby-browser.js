import ReactGA from "react-ga"
import Cookies from "universal-cookie"
import merge from "lodash/merge"

import defaultOptions from "./default-options"
import {
  validGATrackingId,
  validFbPixelId,
  validGTMTrackingId,
} from "./valid-tracking-id"

const cookies = new Cookies()
const currentEnvironment =
  process.env.ENV || process.env.NODE_ENV || `development`

const isEnvironmentValid = environments => {
  return environments.includes(currentEnvironment)
}

// init

export const onClientEntry = (_, pluginOptions = {}) => {
  const options = merge(defaultOptions, pluginOptions)

  if (isEnvironmentValid(options.environments)) {
    // google analytics
    initGoogleAnalytics(options)

    // facebook pixel
    initFacebookPixel(options)
  }
}

/**
 * initialize ga tracking
 * added the ability to use a lookup table for GA ids based on locale
 *
 * @param {*} options
 */
const initGoogleAnalytics = (options) => {
  let localeBasedId = null;

  if (options.googleAnalytics.trackingIdsByLocale && options.googleAnalytics.trackingIdsByLocale.length > 0) {
    const tids = options.googleAnalytics.trackingIdsByLocale;
    const referrer = document.referrer;
    // get the pathname (en-us, es-es, etc)
    const pathname = (window.location.pathname.split('/').join('') === '') ? 'en-us' : window.location.pathname.split('/').join('');

    // get a list o the tids in the system
    if (pathname && tids.find(obj => obj.subdomain === pathname)) {
      const locale = tids.find(obj => obj.subdomain === pathname);
      localeBasedId = locale.code;
    }

    console.log(referrer, pathname)
    window.referrer = "";
  }

  if (
    cookies.get(options.googleAnalytics.cookieName) === `true` &&
    validGATrackingId(options)
  ) {
    ReactGA.initialize(localeBasedId || options.googleAnalytics.trackingId)
    window.GoogleAnalyticsIntialized = true
  }
}

const initFacebookPixel = (options) => {
  if (
    cookies.get(options.facebookPixel.cookieName) === `true` &&
    validFbPixelId(options) &&
    typeof window.fbq === `function`
  ) {
    window.fbq(`init`, options.facebookPixel.pixelId)
    window.FacebookPixelInitialized = true
  }
}

const checkIfGoogleAnalyticsIsInitilized = () => !!window.GoogleAnalyticsIntialized
const checkIfFacebookPixelIsInitilized = () => !!window.FacebookPixelInitialized

// track
export const onRouteUpdate = ({ location }, pluginOptions = {}) => {
  const options = merge(defaultOptions, pluginOptions)

  if (isEnvironmentValid(options.environments)) {
    // google analytics
    if (!checkIfGoogleAnalyticsIsInitilized()) initGoogleAnalytics(options);
    if (
      cookies.get(options.googleAnalytics.cookieName) === `true` &&
      validGATrackingId(options) &&
      ReactGA.ga
    ) {
      let gaAnonymize = options.googleAnalytics.anonymize
      let gaAllowAdFeatures = options.googleAnalytics.allowAdFeatures
      gaAnonymize = gaAnonymize !== undefined ? gaAnonymize : true
      gaAllowAdFeatures = gaAllowAdFeatures !== undefined ? gaAllowAdFeatures : true
      ReactGA.set({ page: location.pathname, anonymizeIp: gaAnonymize, allowAdFeatures: gaAllowAdFeatures })
      ReactGA.pageview(location.pathname)
    }

    // google tag manager
    if (
      cookies.get(options.googleTagManager.cookieName) === `true` &&
      validGTMTrackingId(options)
    ) {
      setTimeout(() => {
        const data = options.googleTagManager.dataLayerName
          ? window[options.googleTagManager.dataLayerName]
          : window.dataLayer

        if (typeof data === `object`) {
          const eventName = options.googleTagManager.routeChangeEvent || `gatsbyRouteChange`
          data.push({ event: eventName })
        }
      }, 50)
    }

    // facebook pixel
    if (!checkIfFacebookPixelIsInitilized()) initFacebookPixel(options);
    if (
      cookies.get(options.facebookPixel.cookieName) === `true` &&
      validFbPixelId(options) &&
      typeof window.fbq === `function`
    ) {
      window.fbq(`track`, `PageView`)
    }
  }
}
