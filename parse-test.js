const parser = require("./dist/commands/ProgressParser").default;
console.log(parser.parse(`Input #1, mov,mp4,m4a,3gp,3g2,mj2, from '/tmp/tmp--22-hVTITX54R46n-.mp3':
Metadata:
  major_brand     : isom
  minor_version   : 512
  compatible_brands: isomiso2avc1mp41
  encoder         : Lavf59.27.100
Duration: 00:03:53.24, start: 0.000000, bitrate: 342 kb/s
2023-02-18T16:41:03.816Z 9e5a7b44-f95d-408d-b26e-eec7c95d7463 INFO Input #1, mov,mp4,m4a,3gp,3g2,mj2, from '/tmp/tmp--22-hVTITX54R46n-.mp3': Metadata: major_brand : isom minor_version : 512 compatible_brands: isomiso2avc1mp41 encoder : Lavf59.27.100 Duration: 00:03:53.24, start: 0.000000, bitrate: 342 kb/s`));
console.log(parser.parse(`frame=    1 fps=0.0 q=-1.0 size=       0kB time=00:00:01.00 bitrate=N/A speed=   0x    
2023-02-18T16:41:03.817Z 9e5a7b44-f95d-408d-b26e-eec7c95d7463 INFO frame= 1 fps=0.0 q=-1.0 size= 0kB time=00:00:01.00 bitrate=N/A speed= 0x`));