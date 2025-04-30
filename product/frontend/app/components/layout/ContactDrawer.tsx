"use client";

import { Instagram, Linkedin, Mail, MessageSquare, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const socialLinks = [
  {
    name: "E-mail us!",
    href: "mailto:contact@omahti.com",
    icon: Mail,
  },
  {
    name: "Instagram",
    href: "https://instagram.com/omahti_ugm",
    icon: Instagram,
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/your-number",
    icon: MessageSquare,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/omahti",
    icon: Linkedin,
  },
];

export function ContactDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="text-gray-400 hover:text-primary-500 transition-colors duration-200">
          Contact
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-center text-2xl">Let's talk!</DrawerTitle>
            <DrawerDescription className="text-center">
              Connect with us through any of these platforms
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </a>
              ))}
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 