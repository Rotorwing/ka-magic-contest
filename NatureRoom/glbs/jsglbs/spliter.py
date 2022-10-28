file = open("/Users/admin/Documents/3DKhan/MagicContest/NatureRoom/glbs/jsglbs/NatureRoomHDv7(brokenUVs)_converted.js", 'r');
lines = file.readlines();
line = lines[0];
file.close();
for n in range(10):
    linewrite = line[int(len(line)/10*n):int(len(line)/10*(n+1))]
    linewrite = "window.NatureRoomHDv7brokenUVs_converted += \"".format(n)+linewrite+"\";"
    file2 = open("/Users/admin/Documents/3DKhan/MagicContest/NatureRoom/glbs/jsglbs/NatureRoom_{}.js".format(n), 'w');
    file2.write(linewrite);
    file2.close();
