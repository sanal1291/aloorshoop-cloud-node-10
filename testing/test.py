import json,os
from typing import List
os.chdir(r'G:\vue projects\aloorshop-cloud2\testing')


f1 = open("order.json")
f2 = open('order2.json')
# j1 = json.loads(f1.read())
# j2 = json.loads(f2.read())
# s1 = set(j1.keys())
# s2 = set(j2.keys())
# print(s2-s1)
# print(s1-s2)
# for key in s2:
#     # # print(type(j1[key]))
#     # if type(j1[key])!= type(j2[key]):
#     #     print(key)
#     print(f"{key}:{j1[key]}={j2[key]}")


# line items

j1 = json.loads(f1.read())["shipping_lines"][0]
j2 = json.loads(f2.read())["shipping_lines"][0]
# j1 = json.loads(f1.read())["shipping"]
# j2 = json.loads(f2.read())["shipping"]
s1 = set(j1.keys())
s2 = set(j2.keys())
print(s2-s1)
print(s1-s2)
for key in s2:
    # # print(type(j1[key]))
    if type(j1[key])!= type(j2[key]):
        print(key)
    # print(f"{key}:{j1[key]}={j2[key]}")
f1.close()
f2.close()