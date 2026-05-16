import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { blogPosts } from "@/data/blogPosts";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const PageNav: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="flex items-center justify-between px-8 py-5 md:px-16 lg:px-24">
      <h1 className="cursor-pointer text-2xl font-black italic tracking-tight" onClick={() => navigate("/")}>
        <span className="text-primary">TOUCH</span>
        <span className="text-foreground">LINE</span>
      </h1>
      <div className="hidden items-center gap-10 md:flex">
        <Link to="/" className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Home</Link>
        <Link to="/blog" className="text-sm font-semibold text-foreground">Blog</Link>
        <Link to="/contact" className="text-sm font-medium text-muted-foreground/70 hover:text-foreground transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button className="hidden rounded-lg px-6 font-bold italic md:inline-flex" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </nav>
  );
};

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <PageNav />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-black italic text-3xl text-foreground">Post not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">The article you're looking for doesn't exist.</p>
          <Button asChild className="mt-6 rounded-lg font-bold italic">
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const others = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60">
        <PageNav />
      </div>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10 md:px-8 md:pt-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          {post.category}
        </span>
        <h1 className="mt-4 font-black italic text-3xl leading-tight text-foreground md:text-5xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{post.author}</span>
          <span>·</span>
          <span>{format(parseISO(post.date), "MMM d, yyyy")}</span>
          <span>·</span>
          <span>{post.readMinutes} min read</span>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <img src={post.cover} alt={post.title} className="aspect-[16/9] w-full object-cover" />
        </div>
        <article className="mt-8 space-y-5 text-base leading-relaxed text-foreground/90">
          {post.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>

        {others.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="font-black italic text-2xl text-foreground">More from Touchline</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to={`/blog/${o.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={o.cover} alt={o.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold italic text-sm text-foreground line-clamp-2">{o.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{format(parseISO(o.date), "MMM d, yyyy")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BlogPostPage;
