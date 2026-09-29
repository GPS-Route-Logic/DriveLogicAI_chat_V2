package com.DriveLogicAI;

import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DriveLogicAI_Ads";
    private AdView adView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize the Google Mobile Ads SDK on a background thread (recommended by Google)
        new Thread(() -> MobileAds.initialize(this, initializationStatus -> {
            Log.d(TAG, "Mobile Ads SDK initialized: " + initializationStatus);
        })).start();

        // Set up the WebChromeClient for Capacitor WebView permissions
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        request.grant(request.getResources());
                    });
                }
            });
        }

        // Load the banner ad
        loadBannerAd();
    }

    /**
     * Finds the AdView declared in activity_main.xml and loads a banner ad.
     * Includes an AdListener for lifecycle logging and error diagnostics.
     */
    private void loadBannerAd() {
        adView = findViewById(R.id.adView);

        if (adView == null) {
            Log.e(TAG, "AdView not found in layout. Verify activity_main.xml contains an AdView with id 'adView'.");
            return;
        }

        adView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                Log.d(TAG, "Banner ad loaded successfully.");
            }

            @Override
            public void onAdFailedToLoad(LoadAdError adError) {
                Log.e(TAG, "Banner ad failed to load: "
                        + "Code=" + adError.getCode()
                        + ", Message=" + adError.getMessage()
                        + ", Domain=" + adError.getDomain()
                        + ", Cause=" + adError.getCause());
            }

            @Override
            public void onAdOpened() {
                Log.d(TAG, "Banner ad opened (full-screen overlay).");
            }

            @Override
            public void onAdClicked() {
                Log.d(TAG, "Banner ad clicked.");
            }

            @Override
            public void onAdClosed() {
                Log.d(TAG, "Banner ad closed.");
            }

            @Override
            public void onAdImpression() {
                Log.d(TAG, "Banner ad impression recorded.");
            }
        });

        // Build and execute the ad request
        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);
        Log.d(TAG, "Banner ad request sent.");
    }

    @Override
    public void onPause() {
        if (adView != null) {
            adView.pause();
        }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (adView != null) {
            adView.resume();
        }
    }

    @Override
    public void onDestroy() {
        if (adView != null) {
            adView.destroy();
        }
        super.onDestroy();
    }
}
