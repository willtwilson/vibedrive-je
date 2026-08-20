import asyncio
from playwright.async_api import async_playwright
import os

OUT = "/root/vibe-drive-jersey"
URL = "http://localhost:5173/index.html"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # Desktop
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto(URL, wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(4000)
        await page.screenshot(path=f"{OUT}/screenshot-desktop.png")
        print("desktop saved")
        
        # Drive for action shot
        await page.keyboard.down("ArrowUp")
        await page.wait_for_timeout(2000)
        await page.keyboard.down("ArrowRight")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUT}/screenshot-driving.png")
        print("driving saved")
        await page.keyboard.up("ArrowRight")
        await page.keyboard.up("ArrowUp")
        
        # iPhone
        phone = await browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        await phone.goto(URL, wait_until="domcontentloaded", timeout=15000)
        await phone.wait_for_timeout(4000)
        await phone.screenshot(path=f"{OUT}/screenshot-iphone.png")
        print("iphone saved")
        
        await browser.close()
        print("done")

asyncio.run(main())