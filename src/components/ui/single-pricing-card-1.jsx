import { PlusIcon, ShieldCheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from './badge.jsx';
import { Button } from './button.jsx';
import { cn } from '../../lib/utils.js';
import { BorderTrail } from './border-trail.jsx';

export function Pricing({ onSignup }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-black via-[#050814] to-[#071a2f] py-24 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(90,140,255,0.25),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_100%,rgba(30,80,200,0.15),transparent_60%)]" />
      <div className="pointer-events-none absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-black to-transparent" />

      <div id="pricing" className="relative z-10 mx-auto w-full max-w-6xl space-y-5 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl space-y-5"
        >
          <div className="flex justify-center">
            <div className="rounded-lg border border-white/10 px-4 py-1 font-mono text-sm text-[#ff5c73]">Pricing</div>
          </div>
          <h2 className="mt-5 text-center text-2xl font-bold tracking-tighter md:text-3xl lg:text-4xl">
            Pricing Based on Your Success
          </h2>
          <p className="mt-5 text-center text-sm text-white/60 md:text-base">
            We offer a single price for all our services. We believe that pricing is a critical component of any
            successful business.
          </p>
        </motion.div>

        <div className="relative">
          <div
            className={cn(
              'pointer-events-none absolute inset-0 -z-10 size-full',
              'bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)]',
              'bg-[size:32px_32px]',
              '[mask-image:radial-gradient(ellipse_at_center,black_10%,transparent)]',
            )}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-2xl space-y-2"
          >
            <div className="relative grid border border-white/10 bg-black/60 p-4 md:grid-cols-2">
              <PlusIcon className="absolute -left-3 -top-3 size-5.5 text-white/40" />
              <PlusIcon className="absolute -right-3 -top-3 size-5.5 text-white/40" />
              <PlusIcon className="absolute -bottom-3 -left-3 size-5.5 text-white/40" />
              <PlusIcon className="absolute -bottom-3 -right-3 size-5.5 text-white/40" />

              <div className="w-full px-4 pb-4 pt-5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold leading-none">Monthly</h3>
                    <div className="flex items-center gap-x-1">
                      <span className="text-sm text-white/60 line-through">$8.99</span>
                      <Badge variant="secondary">11% off</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-white/60">Best value for growing businesses!</p>
                </div>
                <div className="mt-10 space-y-4">
                  <div className="flex items-end gap-0.5 text-xl text-white/60">
                    <span>$</span>
                    <span className="-mb-0.5 text-4xl font-extrabold tracking-tighter text-white md:text-5xl">
                      7.99
                    </span>
                    <span>/month</span>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <a
                      href="/generator"
                      onClick={(event) => {
                        event.preventDefault();
                        onSignup?.();
                      }}
                    >
                      Start Your Journey
                    </a>
                  </Button>
                </div>
              </div>
              <div className="relative w-full rounded-lg border border-white/10 px-4 pb-4 pt-5">
                <BorderTrail
                  style={{
                    boxShadow:
                      '0px 0px 60px 30px rgb(255 255 255 / 25%), 0 0 100px 60px rgb(255 92 115 / 16%), 0 0 140px 90px rgb(0 0 0 / 50%)',
                  }}
                  size={100}
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold leading-none">Yearly</h3>
                    <div className="flex items-center gap-x-1">
                      <span className="text-sm text-white/60 line-through">$8.99</span>
                      <Badge>22% off</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-white/60">Unlock savings with an annual commitment!</p>
                </div>
                <div className="mt-10 space-y-4">
                  <div className="flex items-end text-xl text-white/60">
                    <span>$</span>
                    <span className="-mb-0.5 text-4xl font-extrabold tracking-tighter text-white md:text-5xl">
                      6.99
                    </span>
                    <span>/month</span>
                  </div>
                  <Button className="w-full" asChild>
                    <a
                      href="/generator"
                      onClick={(event) => {
                        event.preventDefault();
                        onSignup?.();
                      }}
                    >
                      Get Started Now
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-x-2 text-sm text-white/60">
              <ShieldCheckIcon className="size-4" />
              <span>Access to all features with no hidden fees</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
