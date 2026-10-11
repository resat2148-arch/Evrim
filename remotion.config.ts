// Remotion CLI ayarları. Render yalnızca recordings/ altındaki kayıtlı veriyi okur.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(4);
// Bulut ortamında önceden kurulu headless Chromium; yerelde silinebilir ya da REMOTION_BROWSER ile değiştirilebilir
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
