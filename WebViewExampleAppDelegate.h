//
//  WebViewExampleAppDelegate.h
//  WebViewExample
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface WebViewExampleAppDelegate : NSObject <NSApplicationDelegate> {
	NSWindow *window;
	IBOutlet WebView *webView;
}

@property (assign) IBOutlet NSWindow *window;
@property (nonatomic, retain) IBOutlet WebView *webView;

@end