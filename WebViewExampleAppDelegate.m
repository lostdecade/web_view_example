//
//  WebViewExampleAppDelegate.m
//  WebViewExample
//

#import "WebViewExampleAppDelegate.h"

@implementation WebViewExampleAppDelegate

@synthesize window;
@synthesize webView;

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
}

- (void)awakeFromNib {
    WebPreferences *prefs = [webView preferences];
	[prefs _setLocalStorageDatabasePath:@"~/Library/WebViewExample/LocalStorage"];
    
	NSString *resourcesPath = [[NSBundle mainBundle] resourcePath];
	NSString *htmlPath = [resourcesPath stringByAppendingString:@"/htdocs/640x480_naked.html"];
	[[webView mainFrame] loadRequest:[NSURLRequest requestWithURL:[NSURL fileURLWithPath:htmlPath]]];
    
    [window setDelegate:self];
}

- (void)windowWillClose:(NSNotification *)aNotification {
	[NSApp terminate:self];
}

@end